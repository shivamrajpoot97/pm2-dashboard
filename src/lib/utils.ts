import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "online":
      return "text-green-400";
    case "stopped":
      return "text-red-400";
    case "stopping":
      return "text-yellow-400";
    case "waiting restart":
      return "text-blue-400";
    case "launching":
      return "text-purple-400";
    case "errored":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "online":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "stopped":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "stopping":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "waiting restart":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "launching":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "errored":
      return "bg-red-600/20 text-red-500 border-red-600/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

export function formatCpuUsage(cpu: number): string {
  return `${cpu.toFixed(1)}%`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}