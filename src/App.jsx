import React, { useState, useMemo, useEffect } from 'react';
import { Heart, Plus, Trash2, Clock, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, FileText, Smartphone, Share } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";

// --- Firebase 配置 ---
const firebaseConfig = {
  apiKey: "AIzaSyDACtFlbQl8m-MQ0eRpclvw8oqTym6DiWE",
  authDomain: "donutsop-e207c.firebaseapp.com",
  projectId: "donutsop-e207c",
  storageBucket: "donutsop-e207c.firebasestorage.app",
  messagingSenderId: "1052194354902",
  appId: "1:1052194354902:web:1b8008671370e3176d3b77"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'poop-tracker-app';

const MOODS = [
  { emoji: '😊', label: '開心' },
  { emoji: '🥰', label: '幸福' },
  { emoji: '😂', label: '大笑' },
  { emoji: '🥺', label: '委屈' },
  { emoji: '😭', label: '大哭' },
  { emoji: '😤', label: '生氣' },
  { emoji: '😩', label: '好累' },
  { emoji: '😳', label: '驚訝' },
  { emoji: '🤒', label: '不舒服' },
  { emoji: '🥳', label: '亢奮' }
];

export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [periodMenuUser, setPeriodMenuUser] = useState(null);
  const [moodMenuUser, setMoodMenuUser] = useState(null);
  const [noteInputUser, setNoteInputUser] = useState(null);
  const [tempNote, setTempNote] = useState("");
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({ user1Name: '旺財 🐶', user2Name: '鄉村女孩 🐰', togetherSince: null });
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName] = useState('');
  const [editingDate, setEditingDate] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'

  const users = [
    { id: 'user1', name: settings.user1Name || '旺財 🐶', color: 'bg-[#FFD1BA]', borderColor: 'border-[#FFD1BA]' },
    { id: 'user2', name: settings.user2Name || '鄉村女孩 🐰', color: 'bg-[#FFE6A7]', borderColor: 'border-[#FFE6A7]' }
  ];

  // Auth & Firestore Listener
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) { console.error(e); }
    };
    initAuth();
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'poop_logs');
    setIsLoading(true);
    const unsubscribe = onSnapshot(logsRef, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data(), time: new Date(d.data().time) })));
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsubscribe();
  }, [user]);

  // Settings sync
  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'settings');
    const unsubscribe = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setSettings(prev => ({ ...prev, ...snap.data() }));
    });
    return () => unsubscribe();
  }, [user]);

  const updateSetting = async (key, value) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), { [key]: value }, { merge: true });
  };

  const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();

  const dailyLogs = useMemo(() => {
    return logs.filter(log => isSameDay(new Date(log.time), selectedDate)).sort((a, b) => b.time - a.time);
  }, [logs, selectedDate]);

  const togetherDays = useMemo(() => {
    if (!settings.togetherSince) return null;
    return Math.floor((new Date() - new Date(settings.togetherSince)) / 86400000);
  }, [settings.togetherSince]);

  const addLog = async (userId, type, extra = null) => {
    const logTime = isSameDay(selectedDate, new Date()) ? Date.now() : new Date(selectedDate).setHours(12, 0);
    let noteText = "完成紀錄";
    if (type === 'poop') noteText = "順暢解放！💩";
    if (type === 'water') noteText = "補充水分 💧";
    if (type === 'period_start') noteText = "姨媽開始 🩸";
    if (type === 'period_end') noteText = "姨媽結束 ✨";
    if (type === 'mood') noteText = `心情：${extra.label}`;
    if (type === 'note') noteText = extra;

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'poop_logs'), {
      userId, type, time: logTime, note: noteText,
      ...(type === 'mood' ? { emoji: extra.emoji } : {}),
      createdAt: Date.now()
    });
  };

  const calendarDays = useMemo(() => {
    if (viewMode === 'week') {
      const res = [];
      const base = new Date(currentViewDate);
      const sunday = new Date(base);
      sunday.setDate(base.getDate() - base.getDay());
      for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        res.push(d);
      }
      return res;
    } else {
      const year = currentViewDate.getFullYear();
      const month = currentViewDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const res = [];
      for (let i = 0; i < firstDay.getDay(); i++) res.push(null);
      for (let d = 1; d <= lastDay.getDate(); d++) res.push(new Date(year, month, d));
      return res;
    }
  }, [currentViewDate, viewMode]);

  const navigate = (dir) => {
    const base = new Date(currentViewDate);
    if (viewMode === 'week') {
      base.setDate(base.getDate() + dir * 7);
    } else {
      base.setMonth(base.getMonth() + dir);
      base.setDate(1);
    }
    setCurrentViewDate(base);
  };

  const getIndicators = (date) => {
    const dayLogs = logs.filter(l => isSameDay(new Date(l.time), date));
    return ['user1', 'user2'].map(uid => {
      const u = dayLogs.filter(l => l.userId === uid);
      return {
        uid,
        hasPoop: u.some(l => l.type === 'poop'),
        hasWater: u.some(l => l.type === 'water'),
        hasNote: u.some(l => l.type === 'note'),
        mood: u.find(l => l.type === 'mood')?.emoji,
        period: u.some(l => l.type === 'period_end') ? '✨' : (u.some(l => l.type?.includes('period')) ? '🩸' : null)
      };
    }).filter(s => s.hasPoop || s.hasWater || s.mood || s.period || s.hasNote);
  };

  if (isLoading) return <div className="min-h-screen bg-[#FFFBF0] flex items-center justify-center text-[#A48A85] font-bold">同步中...</div>;

  return (
    <div className="min-h-screen bg-[#FFFBF0] text-[#7A5C58] p-4 pb-10 select-none">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-black text-[#8A6A64] flex items-center gap-2"><Heart className="fill-[#FFB5A7] text-[#FFB5A7] w-6 h-6" /> 我們的日常</h1>
            {editingDate ? (
              <input type="date" autoFocus
                className="mt-1 text-xs border border-[#FFB5A7] rounded-lg px-2 py-0.5 outline-none"
                defaultValue={settings.togetherSince || ''}
                onBlur={(e) => { if (e.target.value) updateSetting('togetherSince', e.target.value); setEditingDate(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingDate(false); }}
              />
            ) : (
              <button onClick={() => setEditingDate(true)} className="mt-0.5 text-[11px] text-[#A48A85] font-bold">
                💕 {togetherDays !== null ? `在一起 ${togetherDays} 天` : '點擊設定紀念日'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm"><ChevronLeft size={18} /></button>
            <button onClick={() => navigate(1)} className="p-2 bg-white rounded-full shadow-sm"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-[#8A6A64]">
            {viewMode === 'month'
              ? `${currentViewDate.getFullYear()}年${currentViewDate.getMonth() + 1}月`
              : ''}
          </span>
          <div className="flex bg-[#F2E0D9] rounded-full p-0.5">
            <button onClick={() => setViewMode('week')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-white text-[#8A6A64] shadow-sm' : 'text-[#A48A85]'}`}>週</button>
            <button onClick={() => setViewMode('month')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white text-[#8A6A64] shadow-sm' : 'text-[#A48A85]'}`}>月</button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-3 shadow-sm border-2 border-[#F2E0D9] mb-6">
          <div className="grid grid-cols-7 gap-0.5">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="text-[10px] font-bold text-[#D5BDB7] text-center mb-1">{d}</div>)}
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;
              const active = isSameDay(date, selectedDate);
              const stats = getIndicators(date);
              const isMonth = viewMode === 'month';
              return (
                <div key={date.getTime()} onClick={() => setSelectedDate(date)}
                  className={`${isMonth ? 'h-14' : 'h-24'} rounded-2xl flex flex-col items-center pt-1.5 cursor-pointer transition-all overflow-hidden ${active ? 'bg-[#FFB5A7] text-white shadow-md' : 'hover:bg-[#FFFBF0]'}`}>
                  <span className={`${isMonth ? 'text-[10px]' : 'text-xs'} font-bold mb-0.5`}>{date.getDate()}</span>
                  <div className={`flex ${isMonth ? 'flex-col gap-0' : 'gap-1'} w-full justify-center overflow-hidden px-0.5`}>
                    {stats.map(s => (
                      <div key={s.uid} className="flex flex-col items-center" style={{fontSize: isMonth ? '10px' : '11px', lineHeight: '1.3'}}>
                        {s.period && <span>{s.period}</span>}
                        {!isMonth && s.hasWater && <span>💧</span>}
                        {!isMonth && s.hasPoop && <span>💩</span>}
                        {!isMonth && s.mood && <span>{s.mood}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {users.map(u => {
            const uLogs = dailyLogs.filter(l => l.userId === u.id);
            const pCount = uLogs.filter(l => l.type === 'poop').length;
            const wCount = uLogs.filter(l => l.type === 'water').length;
            const curMood = uLogs.find(l => l.type === 'mood');
            return (
              <div key={u.id} className={`bg-white rounded-[2rem] p-5 border-4 ${u.borderColor} shadow-sm relative min-h-[240px] flex flex-col justify-between`}>
                <div className="text-center">
                  <div className="font-bold text-sm mb-2 flex items-center justify-center gap-1">
                    {editingName === u.id ? (
                      <input autoFocus
                        className="text-sm font-bold text-center border-b border-[#FFB5A7] outline-none bg-transparent w-28"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={() => { if (tempName.trim()) updateSetting(u.id === 'user1' ? 'user1Name' : 'user2Name', tempName.trim()); setEditingName(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingName(null); }}
                      />
                    ) : (
                      <button onClick={() => { setEditingName(u.id); setTempName(u.name); }} className="font-bold text-sm">
                        {u.name}
                      </button>
                    )}
                    {curMood && <span className="text-lg">{curMood.emoji}</span>}
                  </div>
                  <div className="flex justify-center gap-4 mb-4">
                    <div className="text-center"><p className="text-[8px] font-black opacity-40 uppercase">Poop</p><p className="text-2xl font-black">{pCount}</p></div>
                    <div className="text-center"><p className="text-[8px] font-black opacity-40 uppercase">Water</p><p className="text-2xl font-black">{wCount}</p></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {noteInputUser === u.id ? (
                    <div className="flex flex-col gap-1">
                      <input className="w-full text-xs p-2 rounded-lg border focus:ring-1 focus:ring-[#FFB5A7] outline-none" placeholder="輸入內容..." value={tempNote} onChange={(e) => setTempNote(e.target.value)} autoFocus />
                      <div className="flex gap-1">
                        <button onClick={() => { if (tempNote) addLog(u.id, 'note', tempNote); setNoteInputUser(null); setTempNote(""); }} className="flex-1 py-1 bg-[#8FB9A8] text-white rounded-lg text-[10px] font-bold">送出</button>
                        <button onClick={() => setNoteInputUser(null)} className="px-2 bg-gray-100 rounded-lg text-[10px]">✕</button>
                      </div>
                    </div>
                  ) : moodMenuUser === u.id ? (
                    <div className="bg-[#FFFBF0] py-1.5 px-1 rounded-xl border border-[#F2E0D9]">
                      <div className="grid grid-cols-5 gap-y-1">
                        {MOODS.map(m => (
                          <button key={m.label} onClick={() => { addLog(u.id, 'mood', m); setMoodMenuUser(null); }} className="flex flex-col items-center text-lg hover:scale-110 transition-transform">
                            <span>{m.emoji}</span>
                            <span className="text-[8px] text-[#A48A85]">{m.label}</span>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setMoodMenuUser(null)} className="mt-1 w-full text-[10px] text-[#A48A85] text-center">✕ 關閉</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => addLog(u.id, 'poop')} className={`col-span-2 py-2 rounded-xl ${u.color} font-bold text-xs shadow-sm`}>+ 大便 💩</button>
                      <button onClick={() => addLog(u.id, 'water')} className="py-2 rounded-xl bg-[#E8F1F2] text-[#5C8E96] font-bold text-[10px]">+ 水</button>
                      <button onClick={() => setMoodMenuUser(u.id)} className="py-2 rounded-xl bg-[#FFF0E5] text-[#D07A59] font-bold text-[10px]">+ 心情</button>
                      <button onClick={() => setNoteInputUser(u.id)} className="py-2 rounded-xl bg-[#F5F5F5] font-bold text-[10px]">+ 小記</button>
                      <button onClick={() => setPeriodMenuUser(u.id === periodMenuUser ? null : u.id)} className="py-2 rounded-xl bg-[#FFF0F0] text-[#D97777] font-bold text-[10px]">+ 月經</button>
                      {periodMenuUser === u.id && (
                        <div className="col-span-2 flex gap-1 mt-1">
                          <button onClick={() => { addLog(u.id, 'period_start'); setPeriodMenuUser(null); }} className="flex-1 py-1 bg-[#FFB5A7] text-white text-[9px] rounded-lg font-bold">開始</button>
                          <button onClick={() => { addLog(u.id, 'period_end'); setPeriodMenuUser(null); }} className="flex-1 py-1 bg-[#EAC8C1] text-white text-[9px] rounded-lg font-bold">結束</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-[#F2E0D9]">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-[#FFB5A7]" /> 紀錄</h3>
          <div className="space-y-3">
            {dailyLogs.length === 0 ? <p className="text-center py-10 text-[#D5BDB7] text-sm">今天還沒有紀錄...</p> :
              dailyLogs.map(l => {
                const u = users.find(user => user.id === l.userId);
                let icon = l.type === 'water' ? '💧' : (l.type === 'note' ? '📝' : (l.type === 'mood' ? (l.emoji || '😊') : (l.type?.includes('period') ? '🩸' : '💩')));
                return (
                  <div key={l.id} className="flex gap-4 bg-[#FFFBF0] p-3 rounded-2xl border border-[#F2E0D9] relative group items-center">
                    <div className={`w-10 h-10 rounded-full ${u.color} flex-shrink-0 flex items-center justify-center text-lg shadow-inner`}>{icon}</div>
                    <div className="flex-grow">
                      <p className="text-xs font-bold">{u.name.split(' ')[0]} {l.type === 'note' ? '筆記了' : '的紀錄'}</p>
                      <p className="text-xs text-[#8A6A64] mt-0.5">{l.note}</p>
                      <p className="text-[9px] font-black text-[#A48A85] mt-1">{l.time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'poop_logs', l.id))} className="opacity-0 group-hover:opacity-100 p-1 text-[#EAC8C1] transition-opacity"><Trash2 size={14} /></button>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}