import re

with open("frontend/src/App.tsx", "r") as f:
    content = f.read()

# 1. Add Personnel import
content = content.replace("import Ships from './pages/Ships';", "import Ships from './pages/Ships';\nimport Personnel from './pages/Personnel';")

# 2. Add Personnel route
route_old = '<Route path="/ships"     element={<ProtectedRoute><MainLayout><Ships /></MainLayout></ProtectedRoute>} />'
route_new = '<Route path="/ships"     element={<ProtectedRoute><MainLayout><Ships /></MainLayout></ProtectedRoute>} />\n        <Route path="/personnel" element={<ProtectedRoute><MainLayout><Personnel /></MainLayout></ProtectedRoute>} />'
content = content.replace(route_old, route_new)

# 3. Add Users import to lucide-react if not present
if "Users" not in content and "import { Users" not in content:
    content = content.replace("Zap, Package, Anchor", "Zap, Package, Anchor, Users")

# 4. Modify the NAV array logic to respect role
nav_old = """  const NAV: NavDef[] = [
    { kind: 'route',  path: '/dashboard', label: 'Overview',         Icon: LayoutDashboard },
    { kind: 'route',  path: '/twin',      label: '3D Twin',          Icon: Box },
    { kind: 'route',  path: '/energy',    label: 'Energy',           Icon: Zap },
    { kind: 'route',  path: '/logistics', label: 'Inventory',        Icon: Package },
    { kind: 'route',  path: '/ships',     label: 'Ship Tracking',    Icon: Anchor },
    { kind: 'route',  path: '/simulator', label: 'Simulator',        Icon: Activity },
    ...(activeNode === 'NCPOR' 
      ? [
          { kind: 'route',  path: '/incidents', label: 'Incident Command', Icon: ShieldAlert } as NavDef
        ]
      : [{ kind: 'route',  path: '/sensors',   label: 'Sensor Management', Icon: Cpu } as NavDef]
    ),
    { kind: 'action', id: 'ai-notifs',   label: 'AI Notifications', Icon: Bell },
    { kind: 'action', id: 'crit-alerts', label: 'Critical Alerts',  Icon: AlertTriangle },
  ];"""

nav_new = """  const role = sessionStorage.getItem('role') || 'general';

  const NAV: NavDef[] = [
    { kind: 'route',  path: '/dashboard', label: 'Overview',         Icon: LayoutDashboard },
    { kind: 'route',  path: '/twin',      label: '3D Twin',          Icon: Box },
    // Energy only for HQ and Generator Operator
    ...(['hq', 'commander', 'generator'].includes(role) ? [{ kind: 'route',  path: '/energy',    label: 'Energy',           Icon: Zap } as NavDef] : []),
    // Logistics only for HQ and Logistics
    ...(['hq', 'commander', 'logistics'].includes(role) ? [
      { kind: 'route',  path: '/logistics', label: 'Inventory',        Icon: Package } as NavDef,
      { kind: 'route',  path: '/ships',     label: 'Ship Tracking',    Icon: Anchor } as NavDef
    ] : []),
    // Personnel for HQ
    ...(['hq', 'commander'].includes(role) ? [{ kind: 'route',  path: '/personnel', label: 'Personnel',        Icon: Users } as NavDef] : []),
    // Simulator for HQ and Commanders
    ...(['hq', 'commander'].includes(role) ? [{ kind: 'route',  path: '/simulator', label: 'Simulator',        Icon: Activity } as NavDef] : []),
    // Node specific
    ...(activeNode === 'NCPOR' 
      ? [
          { kind: 'route',  path: '/incidents', label: 'Incident Command', Icon: ShieldAlert } as NavDef
        ]
      : ['hq', 'commander'].includes(role) ? [{ kind: 'route',  path: '/sensors',   label: 'Sensor Management', Icon: Cpu } as NavDef] : []
    ),
    { kind: 'action', id: 'ai-notifs',   label: 'AI Notifications', Icon: Bell },
    { kind: 'action', id: 'crit-alerts', label: 'Critical Alerts',  Icon: AlertTriangle },
  ];"""

content = content.replace(nav_old, nav_new)

with open("frontend/src/App.tsx", "w") as f:
    f.write(content)

