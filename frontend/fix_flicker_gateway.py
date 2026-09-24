import re

with open("src/pages/GatewayPage.tsx", "r") as f:
    content = f.read()

# 1. StationCard
# Add tailwind classes: hover:bg-white/10 hover:border-white/20 transition-all duration-200
content = re.sub(
    r'\s*whileHover=\{\{ backgroundColor: "rgba\(255,255,255,0\.1\)", borderColor: "rgba\(255,255,255,0\.2\)" \}\}\n\s*transition=\{\{ duration: 0\.2 \}\}',
    '',
    content
)
content = content.replace(
    'className="bg-white/5 border border-white/10 rounded-3xl flex flex-col relative overflow-hidden backdrop-blur-md cursor-pointer group origin-center h-full p-0"',
    'className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-3xl flex flex-col relative overflow-hidden backdrop-blur-md cursor-pointer group origin-center h-full p-0"'
)

# 2. Metric block 1 (Blue)
content = re.sub(
    r'<motion\.div whileHover=\{\{ backgroundColor: "rgba\(255,255,255,0\.08\)" \}\} transition=\{\{ duration: 0\.2 \}\} className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl backdrop-blur-md transition-colors cursor-default">',
    r'<div className="bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 p-5 rounded-2xl backdrop-blur-md transition-colors duration-300 cursor-default">',
    content
)

# 3. Metric block 2 (Emerald)
content = re.sub(
    r'<motion\.div whileHover=\{\{ backgroundColor: "rgba\(255,255,255,0\.08\)" \}\} transition=\{\{ duration: 0\.2 \}\} className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl backdrop-blur-md transition-colors cursor-default">',
    r'<div className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 p-5 rounded-2xl backdrop-blur-md transition-colors duration-300 cursor-default">',
    content
)

# 4. Metric block 3 (Purple)
content = re.sub(
    r'<motion\.div whileHover=\{\{ backgroundColor: "rgba\(255,255,255,0\.08\)" \}\} transition=\{\{ duration: 0\.2 \}\} className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-2xl backdrop-blur-md transition-colors cursor-default">',
    r'<div className="bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 p-5 rounded-2xl backdrop-blur-md transition-colors duration-300 cursor-default">',
    content
)

# 5. Metric block 4 (Alerts - Dynamic)
content = re.sub(
    r'<motion\.div whileHover=\{\{ backgroundColor: "rgba\(255,255,255,0\.08\)" \}\} transition=\{\{ duration: 0\.2 \}\} className=\{`p-5 rounded-2xl backdrop-blur-md transition-colors cursor-default \$\{alertCount > 0 \? \'bg-red-500/10 border border-red-500/20\' : \'bg-white/5 border border-white/10\'\}`\}>',
    r'<div className={`p-5 rounded-2xl backdrop-blur-md transition-colors duration-300 cursor-default ${alertCount > 0 ? \'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20\' : \'bg-white/5 hover:bg-white/10 border border-white/10\'}`}>',
    content
)

# Change closing tags from </motion.div> to </div> for the 4 metrics blocks
# Let's just do a blanket replace for the 4 occurrences after the header
# I'll manually replace them by counting
content = content.replace("</motion.div>\n          \n          <div className=\"bg-emerald-500/10", "</div>\n          \n          <div className=\"bg-emerald-500/10")
# Actually regex is safer
content = re.sub(r'</p>\n          </motion\.div>', r'</p>\n          </div>', content)

with open("src/pages/GatewayPage.tsx", "w") as f:
    f.write(content)

