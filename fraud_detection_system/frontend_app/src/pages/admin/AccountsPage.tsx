import React, { useEffect, useMemo, useState } from 'react';
import { Ban, Loader2, RefreshCw, Search, ShieldOff, Unlock, UsersRound, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { getAdminAccounts, updateAdminAccountStatus, updateAdminUserStatus } from '../../services/api';
import { formatVnd } from '../../services/auth';

interface AdminAccountItem {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  user_status: 'ACTIVE' | 'BANNED';
  balance: number;
  currency: string;
  status: 'ACTIVE' | 'FROZEN';
}

type AccountFilter = 'ALL' | 'ACTIVE' | 'FROZEN';
type UserFilter = 'ALL' | 'ACTIVE' | 'BANNED';

export const AccountsPage = () => {
  const [accounts, setAccounts] = useState<AdminAccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('ALL');
  const [userFilter, setUserFilter] = useState<UserFilter>('ALL');
  const [actionLoading, setActionLoading] = useState('');

  const loadAccounts = async () => {
    setError('');
    setIsLoading(true);

    try {
      const data = await getAdminAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err.message || 'Could not load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    getAdminAccounts()
      .then((data) => {
        if (mounted) setAccounts(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Could not load accounts');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesQuery =
        !normalizedQuery ||
        account.username.toLowerCase().includes(normalizedQuery) ||
        account.full_name.toLowerCase().includes(normalizedQuery) ||
        String(account.id).includes(normalizedQuery) ||
        String(account.user_id).includes(normalizedQuery);

      const matchesAccountStatus = accountFilter === 'ALL' || account.status === accountFilter;
      const matchesUserStatus = userFilter === 'ALL' || account.user_status === userFilter;

      return matchesQuery && matchesAccountStatus && matchesUserStatus;
    });
  }, [accounts, accountFilter, query, userFilter]);

  const frozenCount = accounts.filter((account) => account.status === 'FROZEN').length;
  const bannedCount = accounts.filter((account) => account.user_status === 'BANNED').length;
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);

  const updateRow = (nextAccount: AdminAccountItem) => {
    setAccounts((prev) =>
      prev.map((account) => (account.id === nextAccount.id ? nextAccount : account))
    );
  };

  const handleAccountStatus = async (account: AdminAccountItem) => {
    const nextStatus = account.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
    const loadingKey = `account-${account.id}`;
    setActionLoading(loadingKey);

    try {
      const result = await updateAdminAccountStatus({ accountId: account.id, status: nextStatus });
      updateRow(result);
      toast.success(nextStatus === 'ACTIVE' ? 'Account unfrozen' : 'Account frozen');
    } catch (err) {
      toast.error(err.message || 'Update account status failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleUserStatus = async (account: AdminAccountItem) => {
    const nextStatus = account.user_status === 'BANNED' ? 'ACTIVE' : 'BANNED';
    const loadingKey = `user-${account.user_id}`;
    setActionLoading(loadingKey);

    try {
      const result = await updateAdminUserStatus({ userId: account.user_id, status: nextStatus });
      updateRow(result);
      toast.success(nextStatus === 'ACTIVE' ? 'User reactivated' : 'User banned');
    } catch (err) {
      toast.error(err.message || 'Update user status failed');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Controls</h1>
          <p className="mt-1 text-sm text-slate-500">
            Account status blocks transactions. User status blocks login.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAccounts}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <UsersRound className="h-5 w-5 text-indigo-600" />
            <p className="text-sm font-medium text-slate-500">Accounts</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{accounts.length.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldOff className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium text-slate-500">Frozen Accounts</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{frozenCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-slate-500">Total Balance</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatVnd(totalBalance)}</p>
          {bannedCount > 0 && <p className="mt-1 text-xs font-medium text-rose-600">{bannedCount} banned users</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search username, name, account ID"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value as AccountFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="ALL">All account status</option>
              <option value="ACTIVE">Account active</option>
              <option value="FROZEN">Account frozen</option>
            </select>
            <select
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value as UserFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="ALL">All user status</option>
              <option value="ACTIVE">User active</option>
              <option value="BANNED">User banned</option>
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="flex min-h-[420px] items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading accounts
          </div>
        )}

        {!isLoading && error && (
          <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {!isLoading && !error && filteredAccounts.length === 0 && (
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <UsersRound className="h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No accounts found</h3>
            <p className="mt-1 text-sm text-slate-500">Change search or status filters.</p>
          </div>
        )}

        {!isLoading && !error && filteredAccounts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Account</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Balance</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Account Status</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">User Status</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((account) => {
                  const accountLoading = actionLoading === `account-${account.id}`;
                  const userLoading = actionLoading === `user-${account.user_id}`;
                  const AccountIcon = account.status === 'FROZEN' ? Unlock : ShieldOff;
                  const UserIcon = account.user_status === 'BANNED' ? Unlock : Ban;

                  return (
                    <tr key={account.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">{account.full_name}</div>
                        <div className="mt-1 text-xs text-slate-500">@{account.username} - User #{account.user_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-sm font-semibold text-slate-900">#{account.id}</div>
                        <div className="mt-1 text-xs text-slate-500">{account.currency}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-slate-900">{formatVnd(account.balance)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={account.status as StatusType} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={account.user_status as StatusType} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col justify-end gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => handleAccountStatus(account)}
                            disabled={Boolean(actionLoading)}
                            className={`inline-flex min-w-36 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                              account.status === 'FROZEN'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {accountLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AccountIcon className="h-3.5 w-3.5" />}
                            {account.status === 'FROZEN' ? 'Unfreeze account' : 'Freeze account'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUserStatus(account)}
                            disabled={Boolean(actionLoading)}
                            className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                              account.user_status === 'BANNED'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            {userLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserIcon className="h-3.5 w-3.5" />}
                            {account.user_status === 'BANNED' ? 'Reactivate user' : 'Ban user'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
