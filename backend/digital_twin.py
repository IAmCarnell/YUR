"""
Digital Twin System Monitoring Module
Provides real-time system monitoring, process management, and agent interfaces
"""

import asyncio
import json
import os
import platform
import psutil
import subprocess
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from fastapi import HTTPException
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security configuration
ALLOWED_COMMANDS = {
    'ps', 'top', 'df', 'free', 'uptime', 'netstat', 'lscpu', 'lsmem', 'lsblk', 'lsusb', 'lspci'
}

PROHIBITED_COMMANDS = {
    'rm', 'del', 'format', 'shutdown', 'reboot', 'halt', 'poweroff', 'init', 'mkfs', 'fdisk'
}

MAX_CONCURRENT_COMMANDS = 5
COMMAND_TIMEOUT = 30

class SystemMetrics(BaseModel):
    """Real-time system metrics"""
    timestamp: datetime
    cpu_percent: float
    cpu_count: int
    cpu_freq: Optional[Dict[str, float]]
    memory_total: int
    memory_available: int
    memory_percent: float
    memory_used: int
    swap_total: int
    swap_used: int
    swap_percent: float
    disk_usage: Dict[str, Dict[str, Any]]
    network_io: Dict[str, int]
    boot_time: datetime
    load_avg: List[float]

class ProcessInfo(BaseModel):
    """Process information"""
    pid: int
    name: str
    status: str
    cpu_percent: float
    memory_percent: float
    memory_info: Dict[str, int]
    create_time: datetime
    cmdline: List[str]
    username: str
    
class HardwareInfo(BaseModel):
    """Hardware information"""
    platform: str
    platform_release: str
    platform_version: str
    architecture: str
    machine: str
    processor: str
    cpu_count: int
    cpu_freq: Optional[Dict[str, float]]
    memory_total: int
    disk_partitions: List[Dict[str, Any]]
    network_interfaces: Dict[str, List[Dict[str, Any]]]

class Agent(BaseModel):
    """Digital twin agent"""
    id: str
    name: str
    type: str
    status: str
    created_at: datetime
    last_active: datetime
    current_task: Optional[str]
    resource_usage: Dict[str, float]
    capabilities: List[str]

class DigitalTwin:
    """Main digital twin system monitoring class"""
    
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.active_commands = 0
        self.command_history: List[Dict[str, Any]] = []
        
    async def get_system_metrics(self) -> SystemMetrics:
        """Get real-time system metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            cpu_freq = None
            try:
                freq = psutil.cpu_freq()
                if freq:
                    cpu_freq = {
                        'current': freq.current,
                        'min': freq.min,
                        'max': freq.max
                    }
            except:
                pass
            
            # Memory metrics
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Disk metrics
            disk_usage = {}
            for partition in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    disk_usage[partition.mountpoint] = {
                        'total': usage.total,
                        'used': usage.used,
                        'free': usage.free,
                        'percent': (usage.used / usage.total) * 100
                    }
                except:
                    continue
            
            # Network metrics
            network_io = psutil.net_io_counters()._asdict()
            
            # System boot time
            boot_time = datetime.fromtimestamp(psutil.boot_time())
            
            # Load average (Unix-like systems only)
            load_avg = []
            try:
                load_avg = list(os.getloadavg())
            except:
                load_avg = [0.0, 0.0, 0.0]
            
            return SystemMetrics(
                timestamp=datetime.now(),
                cpu_percent=cpu_percent,
                cpu_count=cpu_count,
                cpu_freq=cpu_freq,
                memory_total=memory.total,
                memory_available=memory.available,
                memory_percent=memory.percent,
                memory_used=memory.used,
                swap_total=swap.total,
                swap_used=swap.used,
                swap_percent=swap.percent,
                disk_usage=disk_usage,
                network_io=network_io,
                boot_time=boot_time,
                load_avg=load_avg
            )
            
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get system metrics: {str(e)}")
    
    async def get_processes(self, limit: int = 50) -> List[ProcessInfo]:
        """Get running processes information"""
        try:
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'status', 'cpu_percent', 'memory_percent', 'memory_info', 'create_time', 'cmdline', 'username']):
                try:
                    info = proc.info
                    processes.append(ProcessInfo(
                        pid=info['pid'],
                        name=info['name'],
                        status=info['status'],
                        cpu_percent=info['cpu_percent'] or 0.0,
                        memory_percent=info['memory_percent'] or 0.0,
                        memory_info=info['memory_info']._asdict() if info['memory_info'] else {},
                        create_time=datetime.fromtimestamp(info['create_time']) if info['create_time'] else datetime.now(),
                        cmdline=info['cmdline'] or [],
                        username=info['username'] or 'unknown'
                    ))
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # Sort by CPU usage and limit results
            processes.sort(key=lambda x: x.cpu_percent, reverse=True)
            return processes[:limit]
            
        except Exception as e:
            logger.error(f"Error getting processes: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get processes: {str(e)}")
    
    async def get_hardware_info(self) -> HardwareInfo:
        """Get hardware information"""
        try:
            # Platform info
            platform_info = platform.uname()
            
            # CPU info
            cpu_count = psutil.cpu_count()
            cpu_freq = None
            try:
                freq = psutil.cpu_freq()
                if freq:
                    cpu_freq = {
                        'current': freq.current,
                        'min': freq.min,
                        'max': freq.max
                    }
            except:
                pass
            
            # Memory info
            memory_total = psutil.virtual_memory().total
            
            # Disk partitions
            disk_partitions = []
            for partition in psutil.disk_partitions():
                disk_partitions.append({
                    'device': partition.device,
                    'mountpoint': partition.mountpoint,
                    'fstype': partition.fstype,
                    'opts': partition.opts
                })
            
            # Network interfaces
            network_interfaces = {}
            for interface, addresses in psutil.net_if_addrs().items():
                network_interfaces[interface] = [
                    {
                        'family': addr.family.name,
                        'address': addr.address,
                        'netmask': addr.netmask,
                        'broadcast': addr.broadcast
                    }
                    for addr in addresses
                ]
            
            return HardwareInfo(
                platform=platform_info.system,
                platform_release=platform_info.release,
                platform_version=platform_info.version,
                architecture=platform_info.machine,
                machine=platform_info.machine,
                processor=platform_info.processor,
                cpu_count=cpu_count,
                cpu_freq=cpu_freq,
                memory_total=memory_total,
                disk_partitions=disk_partitions,
                network_interfaces=network_interfaces
            )
            
        except Exception as e:
            logger.error(f"Error getting hardware info: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get hardware info: {str(e)}")
    
    async def execute_command(self, command: str, args: List[str] = None, timeout: int = COMMAND_TIMEOUT) -> Dict[str, Any]:
        """Execute system command with security controls"""
        if self.active_commands >= MAX_CONCURRENT_COMMANDS:
            raise HTTPException(status_code=429, detail="Too many concurrent commands")
        
        # Security check
        if command in PROHIBITED_COMMANDS:
            raise HTTPException(status_code=403, detail=f"Command '{command}' is prohibited")
        
        if command not in ALLOWED_COMMANDS:
            raise HTTPException(status_code=403, detail=f"Command '{command}' is not in allowed list")
        
        self.active_commands += 1
        start_time = time.time()
        
        try:
            # Prepare command
            cmd = [command] + (args or [])
            
            # Execute command
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False
            )
            
            execution_time = time.time() - start_time
            
            # Log command execution
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'command': command,
                'args': args or [],
                'return_code': result.returncode,
                'execution_time': execution_time,
                'success': result.returncode == 0
            }
            self.command_history.append(log_entry)
            
            # Keep only last 100 commands in history
            if len(self.command_history) > 100:
                self.command_history = self.command_history[-100:]
            
            return {
                'command': command,
                'args': args or [],
                'return_code': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'execution_time': execution_time,
                'success': result.returncode == 0
            }
            
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=408, detail=f"Command '{command}' timed out after {timeout} seconds")
        except Exception as e:
            logger.error(f"Error executing command '{command}': {e}")
            raise HTTPException(status_code=500, detail=f"Failed to execute command: {str(e)}")
        finally:
            self.active_commands -= 1
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status"""
        try:
            metrics = await self.get_system_metrics()
            
            # Determine health status
            health_score = 100
            warnings = []
            
            # CPU check
            if metrics.cpu_percent > 90:
                health_score -= 20
                warnings.append("High CPU usage")
            elif metrics.cpu_percent > 75:
                health_score -= 10
                warnings.append("Elevated CPU usage")
            
            # Memory check
            if metrics.memory_percent > 90:
                health_score -= 20
                warnings.append("High memory usage")
            elif metrics.memory_percent > 75:
                health_score -= 10
                warnings.append("Elevated memory usage")
            
            # Disk check
            for mount, usage in metrics.disk_usage.items():
                if usage['percent'] > 95:
                    health_score -= 15
                    warnings.append(f"Disk {mount} nearly full")
                elif usage['percent'] > 85:
                    health_score -= 5
                    warnings.append(f"Disk {mount} low on space")
            
            # Determine status
            if health_score >= 90:
                status = "healthy"
            elif health_score >= 70:
                status = "warning"
            else:
                status = "critical"
            
            return {
                'status': status,
                'health_score': max(0, health_score),
                'warnings': warnings,
                'metrics_summary': {
                    'cpu_percent': metrics.cpu_percent,
                    'memory_percent': metrics.memory_percent,
                    'disk_usage_max': max([usage['percent'] for usage in metrics.disk_usage.values()]) if metrics.disk_usage else 0,
                    'load_avg_1min': metrics.load_avg[0] if metrics.load_avg else 0
                },
                'uptime_seconds': (datetime.now() - metrics.boot_time).total_seconds(),
                'active_agents': len(self.agents),
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            return {
                'status': 'error',
                'health_score': 0,
                'warnings': [f"System monitoring error: {str(e)}"],
                'last_updated': datetime.now().isoformat()
            }
    
    async def create_agent(self, name: str, agent_type: str, capabilities: List[str] = None) -> Agent:
        """Create a new digital twin agent"""
        agent_id = f"agent_{len(self.agents)}_{int(time.time())}"
        
        agent = Agent(
            id=agent_id,
            name=name,
            type=agent_type,
            status="active",
            created_at=datetime.now(),
            last_active=datetime.now(),
            current_task=None,
            resource_usage={'cpu': 0.0, 'memory': 0.0},
            capabilities=capabilities or []
        )
        
        self.agents[agent_id] = agent
        logger.info(f"Created agent {agent_id}: {name}")
        
        return agent
    
    async def get_agents(self) -> List[Agent]:
        """Get all digital twin agents"""
        return list(self.agents.values())
    
    async def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get specific agent by ID"""
        return self.agents.get(agent_id)
    
    async def assign_agent_task(self, agent_id: str, task: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Assign task to an agent"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
        
        # Update agent status
        agent.current_task = task
        agent.last_active = datetime.now()
        agent.status = "busy"
        
        # Simulate task processing (in real implementation, this would be more sophisticated)
        result = {
            'agent_id': agent_id,
            'task': task,
            'parameters': parameters or {},
            'status': 'assigned',
            'assigned_at': datetime.now().isoformat()
        }
        
        logger.info(f"Assigned task '{task}' to agent {agent_id}")
        return result
    
    def get_command_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get command execution history"""
        return self.command_history[-limit:]

# Global digital twin instance
digital_twin = DigitalTwin()