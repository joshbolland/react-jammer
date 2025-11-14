'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { Message, Profile } from '@/lib/types'
import { useAuth } from './AuthProvider'
import { format } from 'date-fns'
import { ConnectButton } from './ConnectButton'

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

  const suggestedConnectProfile = useMemo(() => {
    if (roomType !== 'jam' || !user) return null
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i]
      if (msg.sender_id !== user.id) {
        return msg.sender as Profile
      }
    }
    return null
  }, [messages, roomType, user])

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
      <div className="h-96 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
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
                  className={`flex flex-col ${isOwn ? 'items-end order-2' : 'items-start order-1'} max-w-[82%] sm:max-w-[70%]`}
                >
                  {!isOwn && sender && (
                    <div className="text-xs text-gray-500 mb-1">{sender.display_name}</div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 w-fit max-w-full break-words ${
                      isOwn
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-900 border'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {format(new Date(message.created_at), 'HH:mm')}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {roomType === 'jam' && suggestedConnectProfile && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-primary-200/70 bg-primary-50/70 px-4 py-3 text-sm text-primary-800">
          <p>
            Enjoyed jamming with <span className="font-semibold">{suggestedConnectProfile.display_name}</span>? Connect to make it easier to play again.
          </p>
          <ConnectButton
            targetUserId={suggestedConnectProfile.id}
            targetDisplayName={suggestedConnectProfile.display_name}
            contextJamId={roomId}
            size="sm"
          />
        </div>
      )}

      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 input-field"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="btn-primary"
        >
          Send
        </button>
      </form>
    </div>
  )
}
