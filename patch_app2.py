import re

with open("frontend/src/App.tsx", "r") as f:
    content = f.read()

# Replace the NAV array definition
old_nav = """  const NAV: NavDef[] = [
    { kind: 'route',  path: '/dashboard', label: 'Overview',         Icon: LayoutDashboard },
    { kind: 'route',  path: '/twin',      label: '3D Twin',          Icon: Box },
    { kind: 'route',  path: '/energy',    label: 'Energy',           Icon: Zap },
    { kind: 'route',  path: '/logistics', label: 'Inventory',        Icon: Package },
    { kind: 'route',  path: '/ships',     label: 'Ship Tracking',    Icon: Anchor },
    { kind: 'route',  path: '/simulator', label: 'Simulator',        Icon: Activity },
    ...(activeNode === 'NCPOR' 
      ? [
          { kind: 'route',  path: '/dashboard', label: 'HQ Gateway', Icon: Building2 } as NavDef,
          { kind: 'route',  path: '/incidents', label: 'Incident Command', Icon: ShieldAlert } as NavDef
        ]
      : [{ kind: 'route',  path: '/sensors',   label: 'Sensor Management', Icon: Cpu } as NavDef]
    ),
    { kind: 'action', id: 'ai-notifs',   label: 'AI Notifications', Icon: Bell },
    { kind: 'action', id: 'crit-alerts', label: 'Critical Alerts',  Icon: AlertTriangle },
  ];"""

new_nav = """  const NAV: NavDef[] = [
    { kind: 'route',  path: '/dashboard', label: activeNode === 'NCPOR' ? 'HQ Gateway' : 'Overview', Icon: activeNode === 'NCPOR' ? Building2 : LayoutDashboard },
    ...(activeNode === 'NCPOR' ? [{ kind: 'route', path: '/dashboard?edge=1', label: 'Station View', Icon: LayoutDashboard } as NavDef] : []),
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

content = content.replace(old_nav, new_nav)

# The active check needs to handle query parameters
content = content.replace(
    "if (item.kind === 'route') return location.pathname === item.path;",
    "if (item.kind === 'route') return location.pathname + location.search === item.path || (item.path === '/dashboard' && location.pathname === '/dashboard' && location.search === '');"
)

# And in handleNavClick, we need to correctly push the full path
content = content.replace(
    "navigate(item.path);",
    "navigate(item.path);"
) # (this is fine, navigate handles queries)

with open("frontend/src/App.tsx", "w") as f:
    f.write(content)
