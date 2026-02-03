export type ToolInfo = {
  name: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  requires_confirmation: boolean;
  external_execution: boolean;
};

export type AgentInfo = {
  id: string;
  name: string;
  model: {
    name: string;
    model: string;
    provider: string;
  };
  tools: {
    tools: ToolInfo[];
  };
  system_message: {
    instructions: string;
  };
  streaming: {
    stream: boolean;
    stream_events: boolean;
  };
};
