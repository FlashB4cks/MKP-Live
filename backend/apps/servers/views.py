from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Server, ServerMember, Invite, RoleChoices
from .serializers import (
    ServerSerializer, ServerDetailSerializer,
    ServerMemberSerializer, InviteSerializer, JoinServerSerializer
)
from channels_app.models import Channel

class ServerListCreateView(generics.ListCreateAPIView):
    serializer_class = ServerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Server.objects.filter(members__user=self.request.user)

    def perform_create(self, serializer):
        with transaction.atomic():
            server = serializer.save(owner=self.request.user)
            # Create Owner membership
            ServerMember.objects.create(
                server=server,
                user=self.request.user,
                role=RoleChoices.OWNER
            )
            # Create default channel
            Channel.objects.create(
                server=server,
                name='general',
                topic='Canal general de conversación'
            )

class ServerDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ServerDetailSerializer
        return ServerSerializer

    def get_queryset(self):
        return Server.objects.filter(members__user=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        member = ServerMember.objects.filter(server=obj, user=request.user).first()
        if not member:
            self.permission_denied(request, message="No eres miembro de este servidor.")

        if request.method in ['PUT', 'PATCH']:
            if member.role not in [RoleChoices.OWNER, RoleChoices.ADMIN]:
                self.permission_denied(request, message="Solo administradores pueden editar el servidor.")

        if request.method == 'DELETE':
            if member.role != RoleChoices.OWNER:
                self.permission_denied(request, message="Solo el dueño puede eliminar el servidor.")

class ServerMembersListView(generics.ListAPIView):
    serializer_class = ServerMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        server_id = self.kwargs['server_id']
        server = get_object_or_404(Server, id=server_id, members__user=self.request.user)
        return server.members.all().select_related('user')

class ServerMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServerMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        server_id = self.kwargs['server_id']
        return ServerMember.objects.filter(server_id=server_id)

    def perform_update(self, serializer):
        instance = self.get_object()
        current_member = ServerMember.objects.filter(
            server=instance.server,
            user=self.request.user
        ).first()

        if not current_member or not current_member.is_admin_or_owner():
            raise permissions.exceptions.PermissionDenied(
                "Solo administradores o el dueño pueden modificar roles y permisos de miembros."
            )

        # Cannot edit owner
        if instance.role == RoleChoices.OWNER and instance.user != self.request.user:
            raise permissions.exceptions.PermissionDenied("No se pueden modificar los permisos del dueño.")

        # Only owner can promote someone to ADMIN or change an ADMIN
        new_role = self.request.data.get('role')
        if (new_role == RoleChoices.ADMIN or instance.role == RoleChoices.ADMIN) and current_member.role != RoleChoices.OWNER:
            raise permissions.exceptions.PermissionDenied("Solo el dueño del servidor puede gestionar el rol de Administrador.")

        serializer.save()

    def perform_destroy(self, instance):
        current_member = ServerMember.objects.filter(
            server=instance.server,
            user=self.request.user
        ).first()

        # Users can leave their own membership (unless owner)
        if instance.user == self.request.user:
            if instance.role == RoleChoices.OWNER:
                raise permissions.exceptions.PermissionDenied(
                    "El dueño no puede salir del servidor sin transferir la propiedad."
                )
            instance.delete()
            return

        # Users with manage_members permission can kick members
        if not current_member or not current_member.has_manage_members_permission():
            raise permissions.exceptions.PermissionDenied(
                "No tienes permisos para expulsar miembros."
            )
        if instance.role == RoleChoices.OWNER:
            raise permissions.exceptions.PermissionDenied("No se puede expulsar al dueño del servidor.")
        if instance.role == RoleChoices.ADMIN and current_member.role != RoleChoices.OWNER:
            raise permissions.exceptions.PermissionDenied("Solo el dueño puede expulsar a un administrador.")

        instance.delete()

class CreateInviteView(generics.CreateAPIView):
    serializer_class = InviteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        server_id = self.kwargs['server_id']
        server = get_object_or_404(Server, id=server_id, members__user=self.request.user)
        serializer.save(server=server, created_by=self.request.user)

class InviteDetailView(generics.RetrieveAPIView):
    queryset = Invite.objects.all()
    serializer_class = InviteSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'code'

class JoinServerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = JoinServerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['invite_code'].strip()

        invite = get_object_or_404(Invite, code=code)
        if not invite.is_valid:
            return Response(
                {"detail": "Esta invitación ha expirado o alcanzó el límite de usos."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already a member
        existing = ServerMember.objects.filter(server=invite.server, user=request.user).first()
        if existing:
            return Response(
                {"detail": "Ya eres miembro de este servidor.", "server_id": invite.server.id},
                status=status.HTTP_200_OK
            )

        with transaction.atomic():
            ServerMember.objects.create(
                server=invite.server,
                user=request.user,
                role=RoleChoices.MEMBER
            )
            invite.uses_count += 1
            invite.save(update_fields=['uses_count'])

        return Response(
            ServerSerializer(invite.server, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
