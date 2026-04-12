import {
    ArrowLeft, Trophy, Users, Settings, Crown, Medal, UserX,
    Trash2, Edit2, Copy, Check, Shield, Loader2, Star, Send,
    MessageCircle, ShieldCheck, ShieldMinus, UserPlus, Save, X,
    Lock, Unlock
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { circleService } from '../services/circleService';
import { Circle, CircleMember } from '../types';

interface CircleDetailViewProps {
    circle: Circle;
    currentUserId?: string;
    onBack: () => void;
    onUpdate: () => void;
}

interface ChatMessage {
    id: string;
    circleId: string;
    userId: string;
    content: string;
    isSystem: boolean;
    createdAt: string;
    senderName: string;
    senderAvatar: string | null;
}

type TabType = 'chat' | 'leaderboard' | 'members' | 'settings';

export const CircleDetailView: React.FC<CircleDetailViewProps> = ({
    circle,
    currentUserId,
    onBack,
    onUpdate
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('chat');
    const [members, setMembers] = useState<CircleMember[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [copied, setCopied] = useState(false);
    const [acting, setActing] = useState<string | null>(null);

    // Pagination states
    const MEMBERS_PER_PAGE = 50;
    const LEADERBOARD_PER_PAGE = 50;
    const [memberPage, setMemberPage] = useState(1);
    const [hasMoreMembers, setHasMoreMembers] = useState(true);
    const [loadingMoreMembers, setLoadingMoreMembers] = useState(false);

    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const [hasMoreLeaderboard, setHasMoreLeaderboard] = useState(true);
    const [loadingMoreLeaderboard, setLoadingMoreLeaderboard] = useState(false);

    // Chat state
    const [chatInput, setChatInput] = useState('');
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Chat mode state
    const [chatMode, setChatMode] = useState<'everyone' | 'admin_only'>(circle.chat_mode || 'everyone');
    const [togglingChatMode, setTogglingChatMode] = useState(false);

    // Edit mode state
    const [editMode, setEditMode] = useState(false);
    const [editName, setEditName] = useState(circle.name);
    const [editDesc, setEditDesc] = useState(circle.description || '');

    useEffect(() => {
        fetchData();
    }, [circle.id]);

    // Hide mobile tab bar when viewing circle detail
    useEffect(() => {
        const tabBar = document.getElementById('mobile-tab-bar');
        if (tabBar) {
            tabBar.style.display = 'none';
        }
        return () => {
            if (tabBar) {
                tabBar.style.display = '';
            }
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'chat') {
            // Subscribe to real-time messages
            const subscription = circleService.subscribeToMessages(circle.id, (newMessage) => {
                setMessages(prev => [...prev, newMessage]);

                // If it's your own message, we might have already added it tentatively, 
                // but this confirms it comes from DB. 
                // For simplicity, we just append. A more robust way handles deduping.
                // Since our send logic re-fetches or appends, deduping is good practice:
                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [activeTab, circle.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [membersData, leaderboardData, messagesData] = await Promise.all([
                circleService.getCircleMembers(circle.id, 1, MEMBERS_PER_PAGE),
                circleService.getCircleLeaderboard(circle.id, 1, LEADERBOARD_PER_PAGE),
                circleService.getMessages(circle.id)
            ]);
            setMembers(membersData);
            setHasMoreMembers(membersData.length === MEMBERS_PER_PAGE);
            setMemberPage(1);

            setLeaderboard(leaderboardData);
            setHasMoreLeaderboard(leaderboardData.length === LEADERBOARD_PER_PAGE);
            setLeaderboardPage(1);

            setMessages(messagesData);

            const currentUserMember = membersData.find(m => m.user_id === currentUserId);
            setIsAdmin(currentUserMember?.role === 'admin' || currentUserMember?.role === 'owner');

            // Fetch latest chat_mode
            const fetchedChatMode = await circleService.getChatMode(circle.id);
            setChatMode(fetchedChatMode);
        } catch (error) {
            console.error('Failed to load circle details', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = useCallback(async () => {
        try {
            const msgs = await circleService.getMessages(circle.id);
            setMessages(msgs);
        } catch (e) {
            // Silently fail on poll
        }
    }, [circle.id]);

    useEffect(() => {
        if (chatEndRef.current && activeTab === 'chat') {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    const handleLoadMoreMembers = async () => {
        if (loadingMoreMembers || !hasMoreMembers) return;
        setLoadingMoreMembers(true);
        try {
            const nextPage = memberPage + 1;
            const newMembers = await circleService.getCircleMembers(circle.id, nextPage, MEMBERS_PER_PAGE);
            setMembers(prev => [...prev, ...newMembers]);
            setMemberPage(nextPage);
            setHasMoreMembers(newMembers.length === MEMBERS_PER_PAGE);
        } catch (error) {
            console.error('Failed to load more members', error);
        } finally {
            setLoadingMoreMembers(false);
        }
    };

    const handleLoadMoreLeaderboard = async () => {
        if (loadingMoreLeaderboard || !hasMoreLeaderboard) return;
        setLoadingMoreLeaderboard(true);
        try {
            const nextPage = leaderboardPage + 1;
            const newRankings = await circleService.getCircleLeaderboard(circle.id, nextPage, LEADERBOARD_PER_PAGE);
            setLeaderboard(prev => [...prev, ...newRankings]);
            setLeaderboardPage(nextPage);
            setHasMoreLeaderboard(newRankings.length === LEADERBOARD_PER_PAGE);
        } catch (error) {
            console.error('Failed to load more leaderboard', error);
        } finally {
            setLoadingMoreLeaderboard(false);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || sending) return;
        const content = chatInput.trim();
        setChatInput('');
        setSending(true);
        try {
            await circleService.sendMessage(circle.id, content);
            // No need to loadMessages(), subscription will catch it.
        } catch (e: any) {
            console.error('Failed to send message:', e);
            setChatInput(content); // Restore on failure
        } finally {
            setSending(false);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(circle.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleKickMember = async (userId: string) => {
        if (!confirm('Remove this member from the circle?')) return;
        setActing(userId);
        try {
            await circleService.removeMember(circle.id, userId);
            setMembers(prev => prev.filter(m => m.user_id !== userId));
            setLeaderboard(prev => prev.filter(l => l.id !== userId));
        } catch (error: any) {
            alert(error.message || 'Failed to remove member');
        } finally {
            setActing(null);
        }
    };

    const handlePromoteMember = async (userId: string) => {
        if (!confirm('Promote this member to Admin?')) return;
        setActing(userId);
        try {
            await circleService.promoteMember(circle.id, userId);
            setMembers(prev => prev.map(m =>
                m.user_id === userId ? { ...m, role: 'admin' } : m
            ));
        } catch (error: any) {
            alert(error.message || 'Failed to promote member');
        } finally {
            setActing(null);
        }
    };

    const handleDemoteMember = async (userId: string) => {
        if (!confirm('Demote this admin to Member?')) return;
        setActing(userId);
        try {
            await circleService.demoteMember(circle.id, userId);
            setMembers(prev => prev.map(m =>
                m.user_id === userId ? { ...m, role: 'member' } : m
            ));
        } catch (error: any) {
            alert(error.message || 'Failed to demote member');
        } finally {
            setActing(null);
        }
    };

    const handleSaveCircleInfo = async () => {
        setActing('save-info');
        try {
            await circleService.updateCircle(circle.id, {
                name: editName.trim(),
                description: editDesc.trim() || undefined,
            });
            setEditMode(false);
            onUpdate();
        } catch (error: any) {
            alert(error.message || 'Failed to update circle info');
        } finally {
            setActing(null);
        }
    };

    const handleDeleteCircle = async () => {
        if (!confirm('⚠️ DELETE this circle permanently? All messages and members will be removed.')) return;
        setActing('delete-circle');
        try {
            await circleService.deleteCircle(circle.id);
            onUpdate();
            onBack();
        } catch (error) {
            alert('Failed to delete circle');
            setActing(null);
        }
    };

    const handleLeaveCircle = async () => {
        if (!confirm('Leave this circle?')) return;
        setActing('leave-circle');
        try {
            await circleService.leaveCircle(circle.id);
            onUpdate();
            onBack();
        } catch (error) {
            alert('Failed to leave circle');
            setActing(null);
        }
    };

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
        if (index === 1) return <Medal className="w-5 h-5 text-slate-400 fill-slate-300" />;
        if (index === 2) return <Medal className="w-5 h-5 text-amber-700 fill-amber-600" />;
        return <span className="font-bold text-slate-500 w-5 text-center">{index + 1}</span>;
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();

        if (diff < 86400000) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (diff < 604800000) {
            return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const tabs: { key: TabType; icon: React.ReactNode; label: string }[] = [
        { key: 'chat', icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Chat' },
        { key: 'leaderboard', icon: <Trophy className="w-3.5 h-3.5" />, label: 'Board' },
        { key: 'members', icon: <Users className="w-3.5 h-3.5" />, label: 'Members' },
        { key: 'settings', icon: <Settings className="w-3.5 h-3.5" />, label: 'Settings' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white px-4 pt-4 pb-4 shadow-sm border-b border-slate-100 z-10 sticky top-0">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 mb-3 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to Circles</span>
                </button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{circle.name}</h1>
                        <p className="text-xs text-slate-500 mt-0.5">{circle.member_count} members</p>
                    </div>
                    <button
                        onClick={handleCopyCode}
                        className="flex flex-col items-end group"
                    >
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Invite Code</span>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${copied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600 group-hover:border-indigo-300'}`}>
                            <span className="font-mono font-bold tracking-widest text-sm">{circle.code}</span>
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </div>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4 p-1 bg-slate-100 rounded-xl">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 ${activeTab === 'chat' ? 'flex flex-col' : 'overflow-y-auto p-4'}`}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-sm">Loading...</p>
                    </div>
                ) : (
                    <>
                        {/* ============ CHAT TAB ============ */}
                        {activeTab === 'chat' && (
                            <>
                                <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                                    {messages.length === 0 && (
                                        <div className="text-center py-16 text-slate-400">
                                            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p className="text-sm font-medium">No messages yet</p>
                                            <p className="text-xs mt-1">Be the first to say something!</p>
                                        </div>
                                    )}
                                    {messages.map((msg, i) => {
                                        const isMe = msg.userId === currentUserId;
                                        const showSender = !msg.isSystem && (i === 0 || messages[i - 1].userId !== msg.userId || messages[i - 1].isSystem);

                                        if (msg.isSystem) {
                                            return (
                                                <div key={msg.id} className="flex justify-center py-2">
                                                    <span className="text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                                        {msg.content}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${showSender ? 'mt-3' : 'mt-0.5'}`}>
                                                <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                    {showSender && !isMe && (
                                                        <p className="text-[11px] font-bold text-indigo-600 mb-0.5 ml-1">{msg.senderName}</p>
                                                    )}
                                                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMe
                                                        ? 'bg-indigo-600 text-white rounded-br-md'
                                                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md'
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                    <p className={`text-[10px] text-slate-400 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                                        {formatTime(msg.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat Input Bar */}
                                {chatMode === 'admin_only' && !isAdmin ? (
                                    <div className="bg-amber-50 border-t border-amber-200 px-4 py-3 flex items-center justify-center gap-2 sticky bottom-0">
                                        <Lock className="w-4 h-4 text-amber-600" />
                                        <span className="text-xs font-medium text-amber-700">Only admins can send messages</span>
                                    </div>
                                ) : (
                                    <div className="bg-white border-t border-slate-100 px-3 py-2 flex items-center gap-2 sticky bottom-0">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                                            disabled={sending}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!chatInput.trim() || sending}
                                            className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full disabled:opacity-40 hover:bg-indigo-700 transition-colors shrink-0"
                                        >
                                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ============ LEADERBOARD TAB ============ */}
                        {activeTab === 'leaderboard' && (
                            <div className="space-y-3">
                                {leaderboard.map((user, index) => {
                                    const isMe = user.id === currentUserId;
                                    return (
                                        <div
                                            key={user.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isMe ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100'}`}
                                        >
                                            <div className="w-8 flex justify-center shrink-0">
                                                {getRankIcon(index)}
                                            </div>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isMe ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    user.full_name?.charAt(0) || '?'
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-bold truncate ${isMe ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                    {user.full_name || 'Unknown'} {isMe && '(You)'}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                        Lvl {user.level || 1}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-indigo-600">{user.xp || 0} XP</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {leaderboard.length === 0 && (
                                    <div className="text-center py-10 text-slate-400"><p>No activity yet.</p></div>
                                )}
                                {hasMoreLeaderboard && (
                                    <div className="pt-2 pb-4 flex justify-center">
                                        <button
                                            onClick={handleLoadMoreLeaderboard}
                                            disabled={loadingMoreLeaderboard}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {loadingMoreLeaderboard ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                            Load More
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ============ MEMBERS TAB ============ */}
                        {activeTab === 'members' && (
                            <div className="space-y-2">
                                <p className="text-xs text-slate-400 font-medium px-1 mb-3">{members.length} members</p>
                                {members
                                    .sort((a, b) => {
                                        const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2 };
                                        return (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2);
                                    })
                                    .map((member) => {
                                        const isMe = member.user_id === currentUserId;
                                        const isMemberAdmin = member.role === 'admin' || member.role === 'owner';

                                        return (
                                            <div
                                                key={member.user_id}
                                                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100"
                                            >
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                                                        {member.profile?.avatar_url ? (
                                                            <img src={member.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            member.profile?.full_name?.charAt(0) || '?'
                                                        )}
                                                    </div>
                                                    {isMemberAdmin && (
                                                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 p-0.5 rounded-full ring-2 ring-white">
                                                            <Crown className="w-2.5 h-2.5 fill-current" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-slate-800 truncate">
                                                        {member.profile?.full_name || 'Unknown'} {isMe && '(You)'}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400">
                                                        {isMemberAdmin ? '🛡️ Admin' : 'Member'} • Joined {new Date(member.joined_at).toLocaleDateString()}
                                                    </p>
                                                </div>

                                                {/* Admin actions on other members */}
                                                {isAdmin && !isMe && (
                                                    <div className="flex items-center gap-1">
                                                        {member.role === 'member' ? (
                                                            <button
                                                                onClick={() => handlePromoteMember(member.user_id)}
                                                                disabled={acting === member.user_id}
                                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Promote to Admin"
                                                            >
                                                                {acting === member.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleDemoteMember(member.user_id)}
                                                                disabled={acting === member.user_id}
                                                                className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                                                title="Demote to Member"
                                                            >
                                                                {acting === member.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldMinus className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleKickMember(member.user_id)}
                                                            disabled={acting === member.user_id}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Remove from circle"
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                {hasMoreMembers && (
                                    <div className="pt-2 pb-4 flex justify-center">
                                        <button
                                            onClick={handleLoadMoreMembers}
                                            disabled={loadingMoreMembers}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {loadingMoreMembers ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                            Load More
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ============ SETTINGS TAB ============ */}
                        {activeTab === 'settings' && (
                            <div className="space-y-4">
                                {/* Invite Code Card */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        <UserPlus className="w-4 h-4 text-indigo-600" />
                                        Invite Members
                                    </h3>
                                    <p className="text-xs text-slate-500">Share this code with others to let them join:</p>
                                    <button
                                        onClick={handleCopyCode}
                                        className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-dashed transition-all font-mono text-lg font-bold tracking-[0.3em] ${copied ? 'border-green-300 bg-green-50 text-green-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400'}`}
                                    >
                                        {circle.code}
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Edit Circle Info (Admin only) */}
                                {isAdmin && (
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                <Edit2 className="w-4 h-4 text-indigo-600" />
                                                Circle Info
                                            </h3>
                                            {!editMode && (
                                                <button
                                                    onClick={() => setEditMode(true)}
                                                    className="text-xs text-indigo-600 font-bold hover:underline"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>

                                        {editMode ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                                                    <textarea
                                                        value={editDesc}
                                                        onChange={e => setEditDesc(e.target.value)}
                                                        rows={3}
                                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                                                        placeholder="What is this circle about?"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleSaveCircleInfo}
                                                        disabled={acting === 'save-info' || !editName.trim()}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                                                    >
                                                        {acting === 'save-info' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditMode(false); setEditName(circle.name); setEditDesc(circle.description || ''); }}
                                                        className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm text-slate-700 font-medium">{circle.name}</p>
                                                <p className="text-xs text-slate-500 mt-1">{circle.description || 'No description'}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Chat Permissions (Admin only) */}
                                {isAdmin && (
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                            <MessageCircle className="w-4 h-4 text-indigo-600" />
                                            Chat Permissions
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">Admin-Only Chat</p>
                                                <p className="text-[11px] text-slate-400">Only admins can send messages</p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const newMode = chatMode === 'everyone' ? 'admin_only' : 'everyone';
                                                    setTogglingChatMode(true);
                                                    try {
                                                        await circleService.updateCircle(circle.id, { chat_mode: newMode });
                                                        setChatMode(newMode);
                                                    } catch (e: any) {
                                                        alert(e.message || 'Failed to update chat mode');
                                                    } finally {
                                                        setTogglingChatMode(false);
                                                    }
                                                }}
                                                disabled={togglingChatMode}
                                                className={`relative w-12 h-7 rounded-full transition-all duration-200 ${chatMode === 'admin_only'
                                                    ? 'bg-indigo-600'
                                                    : 'bg-slate-200'
                                                    }`}
                                            >
                                                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center transition-transform duration-200 ${chatMode === 'admin_only' ? 'translate-x-[22px]' : 'translate-x-0.5'
                                                    }`}>
                                                    {togglingChatMode ? (
                                                        <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                                                    ) : chatMode === 'admin_only' ? (
                                                        <Lock className="w-3 h-3 text-indigo-600" />
                                                    ) : (
                                                        <Unlock className="w-3 h-3 text-slate-400" />
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Danger Zone */}
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3">
                                    <h3 className="font-bold text-red-900 text-sm flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Danger Zone
                                    </h3>

                                    {isAdmin ? (
                                        <button
                                            onClick={handleDeleteCircle}
                                            disabled={acting === 'delete-circle'}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
                                        >
                                            {acting === 'delete-circle' ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <><Trash2 className="w-4 h-4" /> Delete Circle</>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleLeaveCircle}
                                            disabled={acting === 'leave-circle'}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
                                        >
                                            {acting === 'leave-circle' ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <><UserX className="w-4 h-4" /> Leave Circle</>
                                            )}
                                        </button>
                                    )}
                                    <p className="text-[10px] text-red-600/70 text-center">
                                        {isAdmin ? 'This action cannot be undone. All data will be removed.' : 'You will be removed from the member list.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

function AlertTriangle(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" /><path d="M12 17h.01" />
        </svg>
    );
}
