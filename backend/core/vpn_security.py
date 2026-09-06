import ipaddress
from django.conf import settings
from rest_framework import permissions

def get_client_ip(request):
    """Extract client IP handling reverse proxies."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip

def get_scope_client_ip(scope):
    """Extract client IP from Channels WebSocket scope."""
    # Check headers for x-forwarded-for
    headers = dict(scope.get('headers', []))
    if b'x-forwarded-for' in headers:
        return headers[b'x-forwarded-for'].decode('utf-8').split(',')[0].strip()
    client = scope.get('client')
    if client and len(client) > 0:
        return client[0]
    return '127.0.0.1'

def is_ip_in_subnets(ip_str, subnets):
    """Check if an IP string belongs to any of the specified CIDR subnets."""
    try:
        ip = ipaddress.ip_address(ip_str)
        for subnet_str in subnets:
            try:
                network = ipaddress.ip_network(subnet_str, strict=False)
                if ip in network:
                    return True
            except ValueError:
                continue
    except ValueError:
        return False
    return False

def verify_vpn_access(request):
    """
    Verifies if a HTTP request originates from the secure VPN network.
    Returns: (is_allowed: bool, client_ip: str, reason: str)
    """
    client_ip = get_client_ip(request)

    # If VPN enforcement is turned off, grant access
    if not getattr(settings, 'VPN_ONLY_MODE', False):
        return True, client_ip, "VPN enforcement is inactive (development mode)"

    # Check secure gateway header if configured
    secure_header = getattr(settings, 'VPN_REQUIRED_HEADER', None)
    if secure_header:
        header_key = f"HTTP_{secure_header.upper().replace('-', '_')}"
        if request.META.get(header_key):
            return True, client_ip, "Authorized via VPN Secure Gateway Header"

    # Check allowed VPN subnets
    allowed_subnets = getattr(settings, 'VPN_ALLOWED_SUBNETS', [])
    if is_ip_in_subnets(client_ip, allowed_subnets):
        return True, client_ip, "Authorized via VPN Subnet"

    return False, client_ip, "Acceso denegado: Esta sesión virtual requiere conexión a la VPN segura de MKP Live."

def verify_ws_vpn_access(scope):
    """
    Verifies if a WebSocket scope originates from the secure VPN network.
    """
    client_ip = get_scope_client_ip(scope)

    if not getattr(settings, 'VPN_ONLY_MODE', False):
        return True, client_ip, "VPN enforcement is inactive"

    secure_header = getattr(settings, 'VPN_REQUIRED_HEADER', None)
    if secure_header:
        headers = dict(scope.get('headers', []))
        header_bytes = secure_header.lower().encode('utf-8')
        if header_bytes in headers:
            return True, client_ip, "Authorized via VPN Header"

    allowed_subnets = getattr(settings, 'VPN_ALLOWED_SUBNETS', [])
    if is_ip_in_subnets(client_ip, allowed_subnets):
        return True, client_ip, "Authorized via VPN Subnet"

    return False, client_ip, "WebSocket connection rejected: Client not connected to MKP Live VPN."

class IsVPNAuthorized(permissions.BasePermission):
    """DRF Permission requiring connection via VPN."""
    message = "Acceso restringido: Debes estar conectado a la VPN segura de MKP Live."

    def has_permission(self, request, view):
        is_allowed, _, _ = verify_vpn_access(request)
        return is_allowed
