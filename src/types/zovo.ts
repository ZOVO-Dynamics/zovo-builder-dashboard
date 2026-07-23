export interface Project {
  id:string;
  name:string;
  status:string;
}

export interface AgentStatus {
  name:string;
  status:string;
}

export interface Usage {
  credits:number;
  requests:number;
}
