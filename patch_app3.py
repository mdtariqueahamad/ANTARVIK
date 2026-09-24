import re

with open("frontend/src/App.tsx", "r") as f:
    content = f.read()

# We need to wrap the Dashboard route element in a small component that reads location.
dashboard_wrapper = """const DashboardWrapper = () => {
  const location = useLocation();
  const isHQ = sessionStorage.getItem('activeNode') === 'NCPOR' && !location.search.includes('edge=1');
  return isHQ ? <HQDashboard /> : <StationOverview />;
};
"""

if "const DashboardWrapper = () => {" not in content:
    content = content.replace(
        "const MainLayout =",
        dashboard_wrapper + "\nconst MainLayout ="
    )

old_route = '<Route path="/dashboard" element={<ProtectedRoute><MainLayout>{sessionStorage.getItem("activeNode") === "NCPOR" && window.location.search !== "?edge" ? <HQDashboard /> : <StationOverview />}</MainLayout></ProtectedRoute>} />'
new_route = '<Route path="/dashboard" element={<ProtectedRoute><MainLayout><DashboardWrapper /></MainLayout></ProtectedRoute>} />'

content = content.replace(old_route, new_route)

with open("frontend/src/App.tsx", "w") as f:
    f.write(content)
