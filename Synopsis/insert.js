const fs = require('fs');
let text = fs.readFileSync('project_synopsis.md', 'utf8');

const replacements = [
  {
    find: "**4.2 Module Breakdown**\n",
    replace: "**4.2 Module Breakdown**\n\n![Decoupled Architecture](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/decoupled_architecture_1777916141573.png)\n\n**Fig. 4.2.** Decoupled Architecture: Core, Viewer, and Editor.\n"
  },
  {
    find: "**4.3 Scene Graph Data Structure Design**\n",
    replace: "**4.3 Scene Graph Data Structure Design**\n\n![Scene Graph Tree Structure](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/scene_graph_tree_1777916156789.png)\n\n**Fig. 4.3.** Scene Graph Tree Structure Visualization.\n"
  },
  {
    find: "- **DFD Level 1**:",
    replace: "![Data Flow Diagram Level 1](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/dfd_level1_1777916172430.png)\n\n**Fig. 4.5.** Data Flow Diagram (DFD) Level 1.\n\n- **DFD Level 1**:"
  },
  {
    find: "- **DFD Level 2**:",
    replace: "![Data Flow Diagram Level 2](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/dfd_level2_1777916188640.png)\n\n**Fig. 4.6.** Data Flow Diagram (DFD) Level 2 (Scene Mutator).\n\n- **DFD Level 2**:"
  },
  {
    find: "- **Use Case Diagram**:",
    replace: "![Use Case Diagram](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/use_case_diagram_1777916210780.png)\n\n**Fig. 4.7.** Comprehensive Use Case Diagram.\n\n- **Use Case Diagram**:"
  },
  {
    find: "- **Class Diagram**:",
    replace: "![Class Diagram](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/class_diagram_1777916230138.png)\n\n**Fig. 4.8.** Class Diagram of Scene Entities.\n\n- **Class Diagram**:"
  },
  {
    find: "- **Sequence Diagram**:",
    replace: "![Sequence Diagram](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/sequence_diagram_1777916246057.png)\n\n**Fig. 4.9.** Sequence Diagram for Save Operation.\n\n- **Sequence Diagram**:"
  },
  {
    find: "- **Activity Diagram**:",
    replace: "![Activity Diagram](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/activity_diagram_1777916261807.png)\n\n**Fig. 4.10.** Activity Diagram for Node Instantiation.\n\n- **Activity Diagram**:"
  },
  {
    find: "**6.3 WebGL and Three.js Integration**\n",
    replace: "**6.3 WebGL and Three.js Integration**\n\n![WebGL Rendering Pipeline](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/webgl_pipeline_1777916276333.png)\n\n**Fig. 6.1.** WebGL Rendering Pipeline Illustration.\n"
  },
  {
    find: "**6.4 Geometric Algorithms (Polygon Clipping)**\n",
    replace: "**6.4 Geometric Algorithms (Polygon Clipping)**\n\n![Polygon Clipping Operations](file:///C:/Users/Vikash/.gemini/antigravity/brain/5d7813cb-8e2d-42e0-a2e1-da04db96bf1d/polygon_clipping_1777916292488.png)\n\n**Fig. 6.2.** Polygon Clipping Boolean Operations.\n"
  }
];

for (const r of replacements) {
  if (text.includes(r.find)) {
    text = text.replace(r.find, r.replace);
    console.log("Successfully replaced for:", r.find.trim());
  } else {
    console.log("Could not find:", r.find.trim());
  }
}

fs.writeFileSync('project_synopsis.md', text);
console.log('Images inserted.');
