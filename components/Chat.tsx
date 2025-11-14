'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { Message, Profile } from '@/lib/types'
import { useAuth } from './AuthProvider'
import { format } from 'date-fns'
import { SendHorizonal } from 'lucide-react'

interface ChatProps {
  roomType: 'dm' | 'jam'
  roomId: string
}

export function Chat({ roomType, roomId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMarkedMessageId = useRef<string | null>(null)
  const supabase = createSupabaseClient()
  const { user } = useAuth()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadMessageWithProfile = useCallback(
    async (messageId: string) => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .eq('id', messageId)
        .single()

      if (data) {
        setMessages((prev) => [...prev, data as any])
      }
    },
    [supabase]
  )

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .eq('room_type', roomType)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
    } else {
      setMessages((data as any) || [])
    }
    setLoading(false)
  }, [supabase, roomType, roomId])

  useEffect(() => {
    loadMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${roomType}:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_type=eq.${roomType}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          if (newMsg.room_id === roomId) {
            loadMessageWithProfile(newMsg.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomType, roomId, supabase, loadMessages, loadMessageWithProfile])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    lastMarkedMessageId.current = null
  }, [roomId, roomType])

  useEffect(() => {
    if (roomType !== 'dm' || !user || messages.length === 0) {
      return
    }

    const latestMessage = messages[messages.length - 1]
    if (!latestMessage) {
      return
    }

    if (lastMarkedMessageId.current === latestMessage.id) {
      return
    }
    lastMarkedMessageId.current = latestMessage.id

    const markAsRead = async () => {
      const { error } = await supabase.rpc('mark_dm_read', { p_dm_id: roomId })
      if (error) {
        console.error('Error marking DM as read:', error)
        return
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('dm:read'))
      }
    }

    void markAsRead()
  }, [messages, roomType, roomId, supabase, user])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    setSending(true)
    try {
      const { error } = await supabase.from('messages').insert({
        room_type: roomType,
        room_id: roomId,
        sender_id: user.id,
        content: newMessage.trim(),
      })

      if (error) throw error

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-[28px] border border-white/70 bg-white/90">
        <div className="text-sm font-medium text-slate-500">Warming up the room...</div>
      </div>
    )
  }

  return (
    <div className="flex h-96 flex-col gap-4">
      <div className="relative flex-1 overflow-y-auto rounded-[24px] border border-slate-100 bg-gradient-to-b from-slate-50/80 via-white to-white/90 p-4 shadow-inner">
        <div className="space-y-4">
        {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center text-slate-500">
              <p className="text-base font-medium text-slate-600">
                It is quiet in here. Say hi to kick things off.
              </p>
              <div className="flex gap-2">
                {[0, 1, 2].map((ghost) => (
                  <span
                    key={ghost}
                    className="h-10 w-10 rounded-full bg-slate-200/70 blur-[0.25px] motion-safe:animate-pulse"
                  />
                ))}
              </div>
            </div>
        ) : (
            messages.map((message) => {
            const sender = message.sender as Profile
            const isOwn = message.sender_id === user?.id

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`group/message flex max-w-[82%] flex-col ${isOwn ? 'order-2 items-end' : 'order-1 items-start'} sm:max-w-[70%]`}
                  >
                    {!isOwn && sender && (
                      <div className="mb-1 text-xs font-medium text-slate-500">{sender.display_name}</div>
                    )}
                    <div
                      className={`w-fit max-w-full break-words rounded-2xl px-4 py-2 text-[0.95rem] font-medium shadow-sm transition ${
                        isOwn
                          ? 'bg-primary-600 text-white shadow-[0_15px_35px_-18px_rgba(99,102,241,0.65)]'
                          : 'bg-white text-slate-900 ring-1 ring-slate-100'
                      }`}
                    >
                      <p>{message.content}</p>
                    </div>
                    <div className="mt-1 text-xs text-slate-400 opacity-0 transition group-hover/message:opacity-100">
                      {format(new Date(message.created_at), 'p')}
                    </div>
                  </div>
                </div>
              )
            })
        )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="space-y-1.5">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),_0_12px_30px_-20px_rgba(24,39,75,0.35)]">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white transition hover:bg-primary-500 disabled:opacity-40"
            aria-label="Send message"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>
        <p className="text-right text-xs text-slate-400">Press Enter to send</p>
      </form>
    </div>
  )
}
