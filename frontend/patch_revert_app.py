import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace imports
content = content.replace("import HQDashboard from './components/dashboard/HQDashboard';\n", "")
content = content.replace("import DigitalTwinView", "import GatewayPage from './pages/GatewayPage';\nimport DigitalTwinView")

# Remove DashboardWrapper
wrapper_match = re.search(r'const DashboardWrapper = \(\) => \{.*?\};\n', content, re.DOTALL)
if wrapper_match:
    content = content.replace(wrapper_match.group(0), "")

# Restore Gateway route
content = content.replace(
    '<Route path="/gateway" element={<Navigate to="/dashboard" replace />} />',
    '<Route path="/gateway" element={<ProtectedRoute><GatewayPage /></ProtectedRoute>} />'
)

# Restore Dashboard route
content = content.replace(
    '<Route path="/dashboard" element={<ProtectedRoute><MainLayout><DashboardWrapper /></MainLayout></ProtectedRoute>} />',
    '<Route path="/dashboard" element={<ProtectedRoute><MainLayout><StationOverview /></MainLayout></ProtectedRoute>} />'
)

# Fix NAV array
# old:
# const NAV: NavDef[] = [
#     { kind: 'route',  path: '/dashboard', label: activeNode === 'NCPOR' ? 'HQ Gateway' : 'Overview', Icon: activeNode === 'NCPOR' ? Building2 : LayoutDashboard },
#     ...(activeNode === 'NCPOR' ? [{ kind: 'route', path: '/dashboard?edge=1', label: 'Station View', Icon: LayoutDashboard } as NavDef] : []),

# new:
# const NAV: NavDef[] = [
#     { kind: 'route',  path: '/dashboard', label: 'Overview',         Icon: LayoutDashboard },

nav_replacement = """const NAV: NavDef[] = [
    { kind: 'route',  path: '/dashboard', label: 'Overview',         Icon: LayoutDashboard },"""
content = re.sub(
    r"const NAV: NavDef\[\] = \[\n\s*\{ kind: 'route',  path: '/dashboard', label: activeNode === 'NCPOR' \? 'HQ Gateway' : 'Overview'.*?\n\s*\.\.\.\(activeNode === 'NCPOR' \? \[\{ kind: 'route', path: '/dashboard\?edge=1', label: 'Station View'.*?\n",
    nav_replacement + "\n",
    content,
    flags=re.DOTALL
)

# And restore the active check logic since we removed query params for routes
content = content.replace(
    "if (item.kind === 'route') return location.pathname + location.search === item.path || (item.path === '/dashboard' && location.pathname === '/dashboard' && location.search === '');",
    "if (item.kind === 'route') return location.pathname === item.path;"
)

# Add "Return to Gateway" button for NCPOR users inside the header or sidebar.
# I'll put it right next to the Generate Report button in the header.
gen_report_btn = """{/* HQ Generate Report Button */}
            {activeNode === 'NCPOR' && (
              <motion.button
                whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.3)" }}
                onClick={handleGenerateReport}
                className="hidden md:flex items-center gap-2 px-3 py-2 mr-2 rounded-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/50 transition-all text-xs font-bold uppercase tracking-widest text-blue-300"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </motion.button>
            )}"""

new_header_btns = """{/* Return to Gateway Button */}
            {activeNode === 'NCPOR' && (
              <motion.button
                whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                onClick={() => navigate('/gateway')}
                className="hidden md:flex items-center gap-2 px-3 py-2 mr-2 rounded-xl bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30 transition-all text-xs font-bold uppercase tracking-widest text-white/80"
              >
                <Building2 className="w-4 h-4" />
                Gateway
              </motion.button>
            )}

            """ + gen_report_btn

content = content.replace(gen_report_btn, new_header_btns)


with open("src/App.tsx", "w") as f:
    f.write(content)

