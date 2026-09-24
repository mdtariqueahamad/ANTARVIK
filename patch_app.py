import re

with open("frontend/src/App.tsx", "r") as f:
    content = f.read()

# Import HQDashboard
if "import HQDashboard" not in content:
    content = content.replace(
        "import StationOverview",
        "import HQDashboard from './components/dashboard/HQDashboard';\nimport StationOverview"
    )

# Fix the Route
old_route = '<Route path="/dashboard" element={<ProtectedRoute><MainLayout><StationOverview /></MainLayout></ProtectedRoute>} />'
new_route = '<Route path="/dashboard" element={<ProtectedRoute><MainLayout>{sessionStorage.getItem("activeNode") === "NCPOR" && window.location.search !== "?edge" ? <HQDashboard /> : <StationOverview />}</MainLayout></ProtectedRoute>} />'

content = content.replace(old_route, new_route)

# Now, we should also fix the GatewayPage route (it's redundant now, but let's keep it or redirect it)
old_gateway = '<Route path="/gateway" element={<ProtectedRoute><GatewayPage /></ProtectedRoute>} />'
new_gateway = '<Route path="/gateway" element={<Navigate to="/dashboard" replace />} />'

content = content.replace(old_gateway, new_gateway)

# Fix sidebar Gateway Select
nav_def = "{ kind: 'route',  path: '/gateway',   label: 'Gateway Select', Icon: Building2 } as NavDef,"
new_nav_def = "{ kind: 'route',  path: '/dashboard', label: 'HQ Gateway', Icon: Building2 } as NavDef,"

content = content.replace(nav_def, new_nav_def)


with open("frontend/src/App.tsx", "w") as f:
    f.write(content)
