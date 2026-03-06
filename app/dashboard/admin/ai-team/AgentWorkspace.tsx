'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  Lightbulb,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  Send,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent } from './AITeamDashboard';

interface AgentWorkspaceProps {
  agent: Agent;
}

// ============================================================
// AGENT WORKSPACE
// ============================================================

export default function AgentWorkspace({ agent }: AgentWorkspaceProps) {
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const lineIndexRef = useRef(0);

  // Simulate terminal lines appearing one by one
  useEffect(() => {
    setTerminalLines([]);
    lineIndexRef.current = 0;
    setIsTyping(true);
    setConversation([]);

    const addLine = () => {
      if (lineIndexRef.current < agent.terminalLines.length) {
        setTerminalLines((prev) => [...prev, agent.terminalLines[lineIndexRef.current]]);
        lineIndexRef.current++;
        const delay = 400 + Math.random() * 600;
        setTimeout(addLine, delay);
      } else {
        setIsTyping(false);
      }
    };

    const timeout = setTimeout(addLine, 300);
    return () => clearTimeout(timeout);
  }, [agent.id]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines, conversation]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const msg = userInput.trim();
    setUserInput('');
    const updatedConversation = [...conversation, { role: 'user' as const, text: msg }];
    setConversation(updatedConversation);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          message: msg,
          conversationHistory: conversation,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al contactar al agente');
      }

      setConversation((prev) => [...prev, { role: 'agent', text: data.response }]);
    } catch (err: any) {
      setConversation((prev) => [
        ...prev,
        { role: 'agent', text: `[ERROR] ${err.message || 'No se pudo procesar la respuesta.'}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setTerminalLines([]);
    lineIndexRef.current = 0;
    setIsTyping(true);
    setConversation([]);

    const addLine = () => {
      if (lineIndexRef.current < agent.terminalLines.length) {
        setTerminalLines((prev) => [...prev, agent.terminalLines[lineIndexRef.current]]);
        lineIndexRef.current++;
        setTimeout(addLine, 400 + Math.random() * 600);
      } else {
        setIsTyping(false);
      }
    };
    setTimeout(addLine, 300);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      {/* LEFT: Terminal + Chat */}
      <div className="xl:col-span-7 space-y-4">
        {/* Agent Header */}
        <div
          className={cn(
            'flex items-center gap-4 p-4 rounded-2xl border',
            agent.bgColor,
            agent.borderColor
          )}
        >
          <div className="text-4xl">{agent.emoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-black uppercase tracking-widest', agent.textColor)}>
                {agent.role}
              </span>
              <span
                className={cn(
                  'text-[9px] font-black uppercase px-2 py-0.5 rounded-full',
                  agent.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : agent.status === 'thinking'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-gray-500/20 text-gray-400'
                )}
              >
                {agent.status === 'active'
                  ? 'Activo'
                  : agent.status === 'thinking'
                    ? 'Procesando...'
                    : 'Disponible'}
              </span>
            </div>
            <h2 className="text-xl font-black text-white italic">{agent.name}_</h2>
            <p className="text-xs text-gray-400">{agent.domain}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            title="Reiniciar análisis"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Terminal */}
        <div
          className={cn(
            'rounded-2xl border overflow-hidden',
            'bg-black border-white/5'
          )}
        >
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] font-mono text-gray-600 ml-2">
                rivalfit-ai — {agent.role.toLowerCase()}-agent@workspace
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-gray-600" />
              <span className="text-[9px] font-mono text-gray-600 uppercase">Live</span>
            </div>
          </div>

          {/* Terminal Content */}
          <div
            ref={terminalRef}
            className="p-4 font-mono text-xs space-y-1 h-72 overflow-y-auto custom-scrollbar"
          >
            {/* Boot message */}
            <div className="text-gray-600 mb-3">
              <span className="text-green-500">rivalfit-ai</span>
              <span className="text-gray-600"> v2.1.0 — {agent.name} ({agent.role}) initialized</span>
            </div>

            {/* Auto-generated lines */}
            {terminalLines.filter(Boolean).map((line, i) => (
              <motion.div
                key={`auto-${i}`}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'leading-relaxed',
                  line?.startsWith('> [OK]')
                    ? 'text-green-400'
                    : line?.startsWith('> [ALERT]')
                      ? 'text-yellow-400'
                      : line?.startsWith('> [WARN]')
                        ? 'text-orange-400'
                        : line?.startsWith('> [THINKING]')
                          ? agent.textColor
                          : 'text-gray-400'
                )}
              >
                {line}
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className={cn('flex items-center gap-1', agent.textColor)}>
                <span>{'>'}</span>
                <span className="animate-pulse">█</span>
              </div>
            )}

            {/* Conversation messages */}
            {conversation.map((msg, i) => (
              <motion.div
                key={`chat-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2"
              >
                {msg.role === 'user' ? (
                  <div className="text-cyan-400">
                    <span className="text-gray-600">$ user@rivalfit:~$ </span>
                    {msg.text}
                  </div>
                ) : (
                  <div className={cn('pl-2 border-l-2', `border-${agent.textColor}`)}>
                    <span className={cn(agent.textColor, 'mr-2')}>[{agent.role}]</span>
                    <span className="text-gray-300">{msg.text}</span>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Loading */}
            {isLoading && (
              <div className={cn('flex items-center gap-2 mt-2', agent.textColor)}>
                <span>[{agent.role}]</span>
                <span className="animate-pulse">Procesando consulta...</span>
                <span className="animate-bounce">▌</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          {!isTyping && (
            <div className="border-t border-white/5 p-3">
              <div className="flex gap-2">
                <span className="text-gray-600 font-mono text-xs self-center">$</span>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={`Pregunta a ${agent.name.split(' ')[0]}...`}
                  className="flex-1 bg-transparent text-xs text-white font-mono outline-none placeholder:text-gray-700"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isLoading}
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    userInput.trim()
                      ? `${agent.bgColor} ${agent.textColor} hover:opacity-80`
                      : 'text-gray-700 cursor-not-allowed'
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-brand-gray/20 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className={cn('w-4 h-4', agent.textColor)} />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Recomendaciones Activas
            </span>
          </div>
          <div className="space-y-2">
            {agent.recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border cursor-pointer group transition-all',
                  agent.bgColor,
                  agent.borderColor,
                  'hover:opacity-80'
                )}
              >
                <ChevronRight className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', agent.textColor)} />
                <span className="text-xs text-gray-300 leading-relaxed">{rec}</span>
                <ArrowUpRight
                  className={cn(
                    'w-3.5 h-3.5 flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity',
                    agent.textColor
                  )}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: KPIs + Tasks */}
      <div className="xl:col-span-5 space-y-4">
        {/* KPIs */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-3">
            KPIs del Área
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {agent.kpis.map((kpi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-brand-gray/20 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all"
              >
                <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">
                  {kpi.label}
                </div>
                <div className="text-xl font-black italic text-white">{kpi.value}</div>
                <div
                  className={cn(
                    'text-[10px] font-black mt-1',
                    kpi.positive ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {kpi.change}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Active Tasks */}
        <div className="bg-brand-gray/20 border border-white/5 rounded-2xl p-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-4">
            Tareas Activas
          </h3>
          <div className="space-y-3">
            {agent.tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {task.progress >= 100 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    ) : task.priority === 'high' ? (
                      <AlertCircle className={cn('w-3.5 h-3.5 flex-shrink-0', agent.textColor)} />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-300 leading-tight">{task.title}</span>
                  </div>
                  <span className="text-[10px] font-black text-gray-600 flex-shrink-0 ml-2">
                    {task.progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-white/5 rounded-full overflow-hidden ml-5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full',
                      task.progress >= 75
                        ? 'bg-green-500'
                        : task.progress >= 40
                          ? `bg-gradient-to-r ${agent.color}`
                          : 'bg-gray-600'
                    )}
                  />
                </div>

                {/* Priority badge */}
                <div className="ml-5">
                  <span
                    className={cn(
                      'text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full',
                      task.priority === 'high'
                        ? 'bg-red-500/10 text-red-400'
                        : task.priority === 'medium'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-gray-500/10 text-gray-500'
                    )}
                  >
                    {task.priority === 'high'
                      ? 'Alta prioridad'
                      : task.priority === 'medium'
                        ? 'Media'
                        : 'Baja'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Status card */}
        <div
          className={cn(
            'rounded-2xl border p-4 relative overflow-hidden',
            agent.bgColor,
            agent.borderColor
          )}
        >
          <div className="relative z-10">
            <div className={cn('text-[10px] font-black uppercase tracking-widest mb-1', agent.textColor)}>
              Estado del Agente
            </div>
            <div className="text-sm text-white font-bold">
              {agent.status === 'active'
                ? `${agent.name.split(' ')[0]} está analizando datos en tiempo real.`
                : agent.status === 'thinking'
                  ? `${agent.name.split(' ')[0]} está procesando una estrategia compleja.`
                  : `${agent.name.split(' ')[0]} está en modo standby — lista para consultas.`}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  agent.status === 'active'
                    ? 'bg-green-400 animate-pulse'
                    : agent.status === 'thinking'
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-gray-400'
                )}
              />
              <span className="text-[10px] text-gray-400">
                Última actualización: hace unos segundos
              </span>
            </div>
          </div>

          {/* Background decoration */}
          <div
            className={cn(
              'absolute -right-8 -bottom-8 text-[80px] opacity-10 select-none'
            )}
          >
            {agent.emoji}
          </div>
        </div>
      </div>
    </div>
  );
}
