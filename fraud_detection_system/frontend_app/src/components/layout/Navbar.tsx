import React, { useEffect, useMemo, useState } from 'react';
import { Bell, UserCircle, Menu, Clock, ShieldAlert, ArrowRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminAlerts, getCurrentUser, getMyTransactions } from '../../services/api';
import { formatVnd, getStoredUser, saveUser } from '../../services/auth';

const formatTime = (value) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [notifications, setNotifications] = useState([]);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const loadNotifications = async (activeUser = user, silent = false) => {
    if (!activeUser?.role) return;

    if (!silent) setIsLoadingNotifications(true);
    try {
      if (activeUser.role === 'ADMIN') {
        const alerts = await getAdminAlerts();
        setNotifications(
          alerts.slice(0, 8).map((alert) => ({
            id: `admin-${alert.id}`,
            title: alert.title,
            body: `${formatVnd(alert.amount)} from @${alert.from_username || alert.username || 'unknown'} to @${
              alert.to_username || 'external'
            }`,
            meta: `${alert.risk_level} risk - ${alert.transaction_status}`,
            status: alert.status,
            created_at: alert.created_at,
            href: '/admin/alerts',
            urgent: alert.risk_level === 'CRITICAL' || alert.status === 'UNREAD',
          }))
        );
      } else {
        const txns = await getMyTransactions();
        setNotifications(
          txns.slice(0, 8).map((txn) => {
            const outgoing = txn.from_account_id === activeUser.account_id;
            const sender = txn.from_username ? `@${txn.from_username}` : 'external';
            const receiver = txn.to_username ? `@${txn.to_username}` : 'external';

            return {
              id: `user-${txn.id}`,
              title: outgoing ? `Sent to ${receiver}` : `Received from ${sender}`,
              body: `${sender} -> ${receiver} - ${formatVnd(txn.amount)}`,
              meta: `${txn.status} - ${txn.risk_level || 'LOW'} risk`,
              status: txn.status,
              created_at: txn.created_at,
              href: '/user/history',
              urgent: ['PENDING', 'BLOCKED', 'FAILED'].includes(txn.status),
            };
          })
        );
      }
    } catch {
      setNotifications([]);
    } finally {
      if (!silent) setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let intervalId;

    getCurrentUser()
      .then((freshUser) => {
        if (!mounted) return;
        saveUser(freshUser);
        setUser(freshUser);
        loadNotifications(freshUser, true);
      })
      .catch(() => {
        if (!mounted) return;
        const storedUser = getStoredUser();
        setUser(storedUser);
        loadNotifications(storedUser, true);
      });

    intervalId = window.setInterval(() => {
      loadNotifications(getStoredUser(), true);
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const alertCount = useMemo(
    () => notifications.filter((item) => item.urgent).length,
    [notifications]
  );

  const handleNotificationClick = (href) => {
    setIsBellOpen(false);
    navigate(href);
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm transition-all duration-200 ease-out">
      <div className="flex items-center gap-4">
        <button className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg leading-none tracking-tight">F</span>
          </div>
          <span className="text-xl font-semibold text-slate-900 tracking-tight">FinGuard</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsBellOpen((value) => !value);
              loadNotifications(user, false);
            }}
            className="text-slate-400 hover:text-indigo-600 transition-colors relative group"
            aria-label="Open notifications"
          >
            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            {alertCount > 0 && (
              <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {isBellOpen && (
            <div className="absolute right-0 mt-3 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">Live notifications</p>
                  <p className="text-xs text-slate-500">
                    {user?.role === 'ADMIN' ? 'Fraud review queue' : 'Transfers and account activity'}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {notifications.length}
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {isLoadingNotifications && (
                  <div className="flex items-center gap-2 px-4 py-5 text-sm text-slate-500">
                    <Activity className="h-4 w-4 animate-pulse" />
                    Syncing latest activity
                  </div>
                )}

                {!isLoadingNotifications && notifications.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <Bell className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">No live alerts</p>
                    <p className="mt-1 text-xs text-slate-500">New transfer and review events will appear here.</p>
                  </div>
                )}

                {!isLoadingNotifications &&
                  notifications.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleNotificationClick(item.href)}
                      className="group flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          item.urgent ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                        }`}
                      >
                        {user?.role === 'ADMIN' ? (
                          <ShieldAlert className="h-4 w-4" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                          <span className={`font-semibold ${item.urgent ? 'text-rose-600' : 'text-slate-500'}`}>
                            {item.meta}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Clock className="h-3 w-3" />
                            {formatTime(item.created_at)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-none">
              {user?.full_name || 'Guest User'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              @{user?.username || 'guest'} - {user?.role || 'USER'}
            </p>
          </div>
          <button className="text-slate-300 hover:text-slate-600 transition-colors active:scale-[0.98]">
            <UserCircle className="w-9 h-9" />
          </button>
        </div>
      </div>
    </header>
  );
};
