import type { NodeTypes } from "@xyflow/react";
import BaseNode from "./base-node";

// All node types use the same BaseNode component.
// The visual differences (icon, color) are driven by data.type.
export const nodeTypes: NodeTypes = {
  greeting: BaseNode,
  question: BaseNode,
  rag_lookup: BaseNode,
  tool_call: BaseNode,
  condition: BaseNode,
  transfer: BaseNode,
  hangup: BaseNode,
  llm_response: BaseNode,
  set_variable: BaseNode,
};
