from rest_framework import generics, permissions
from django.shortcuts import get_object_or_404
from .models import Channel
from .serializers import ChannelSerializer
from servers.models import Server, ServerMember, RoleChoices

class ChannelListCreateView(generics.ListCreateAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        server_id = self.request.query_params.get('server')
        if not server_id:
            return Channel.objects.none()
        server = get_object_or_404(Server, id=server_id, members__user=self.request.user)
        return server.channels.all()

    def perform_create(self, serializer):
        server_id = self.request.data.get('server')
        server = get_object_or_404(Server, id=server_id)
        member = ServerMember.objects.filter(server=server, user=self.request.user).first()
        if not member or member.role not in [RoleChoices.OWNER, RoleChoices.ADMIN]:
            raise permissions.exceptions.PermissionDenied(
                "Solo administradores pueden crear canales en este servidor."
            )
        serializer.save(server=server)

class ChannelDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        member = ServerMember.objects.filter(server=obj.server, user=request.user).first()
        if not member:
            self.permission_denied(request, message="No tienes acceso a este servidor.")

        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if member.role not in [RoleChoices.OWNER, RoleChoices.ADMIN]:
                self.permission_denied(request, message="Solo administradores pueden modificar o eliminar canales.")
