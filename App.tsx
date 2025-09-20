// Daily Spend — React Native (Expo) Starter
// One‑Tap Expense Logger + Daily Spend Meter + Weekly History
// Single‑file App.tsx so you can paste into a fresh Expo project.
// Dependencies (install after creating the app):
//   expo install react-native-svg
//   npm i @react-native-async-storage/async-storage
//   expo install expo-haptics

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, Pressable, TextInput, FlatList, StyleSheet, Alert, Platform, StatusBar, ScrollView, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import SplashScreen from './SplashScreen';

// ---------- Types ----------
interface ExpenseEntry {
  id: string;
  amount: number;
  timestamp: number; // ms epoch
  category: string;
  note: string;
}

interface DayBook {
  [dayKey: string]: ExpenseEntry[];
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// ---------- Storage Keys ----------
const KEY_BUDGET = 'dailyBudget';
const KEY_QUICK = 'quickAmounts';
const KEY_BOOK = 'dayBook';
const KEY_CATEGORIES = 'categories';
const KEY_CURRENCY = 'currency';

// ---------- Default Categories ----------
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', color: '#ef4444', icon: '🍔' },
  { id: 'transport', name: 'Transport', color: '#3b82f6', icon: '🚗' },
  { id: 'entertainment', name: 'Entertainment', color: '#8b5cf6', icon: '🎬' },
  { id: 'shopping', name: 'Shopping', color: '#10b981', icon: '🛍️' },
  { id: 'health', name: 'Health', color: '#f59e0b', icon: '💊' },
  { id: 'other', name: 'Other', color: '#6b7280', icon: '📝' },
];

// ---------- Currency Options ----------
const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

// ---------- Date Helpers ----------
const dateKey = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const weekdayShort = (d: Date) => {
  return d.toLocaleDateString(undefined, { weekday: 'narrow' }); // e.g., M, T, W
};

// ---------- Currency Helper ----------
const fmtCurrency = (n: number, currencySymbol: string = '$') => {
  return `${currencySymbol}${n.toFixed(2)}`;
};

const fmtCurrencyNoSymbol = (n: number) => {
  return n.toFixed(2);
};

// ---------- Main App ----------
export default function App() {
  // State
  const [dailyBudget, setDailyBudget] = useState<number>(30);
  const [quickAmounts, setQuickAmounts] = useState<number[]>([2, 5, 10, 20]);
  const [book, setBook] = useState<DayBook>({});
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [expenseNote, setExpenseNote] = useState<string>('');
  const [showAddExpense, setShowAddExpense] = useState<boolean>(false);
  const [currency, setCurrency] = useState<typeof CURRENCY_OPTIONS[0]>(CURRENCY_OPTIONS[0]);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [todayKey, setTodayKey] = useState<string>(() => dateKey(new Date()));

  // Update todayKey when date changes
  useEffect(() => {
    const updateDate = () => {
      const newTodayKey = dateKey(new Date());
      if (newTodayKey !== todayKey) {
        setTodayKey(newTodayKey);
      }
    };

    // Check every minute if date has changed
    const interval = setInterval(updateDate, 60000);

    // Also check when app comes back to focus (in case user switched apps and came back the next day)
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        updateDate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, [todayKey]);
  const todayEntries = useMemo(() => book[todayKey] || [], [book, todayKey]);
  const todayTotal = useMemo(() => todayEntries.reduce((acc, e) => acc + e.amount, 0), [todayEntries]);
  const remaining = Math.max(0, dailyBudget - todayTotal);
  const progress = dailyBudget > 0 ? Math.min(1, todayTotal / dailyBudget) : 0;

  // Spending summary calculations
  const spendingSummary = useMemo(() => {
    const allEntries = Object.values(book).flat();
    const totalSpent = allEntries.reduce((acc, e) => acc + e.amount, 0);
    const totalDays = Object.keys(book).length || 1;
    const averageDaily = totalSpent / totalDays;

    // This month's total
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const thisMonthEntries = allEntries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate.getMonth() === thisMonth && entryDate.getFullYear() === thisYear;
    });
    const thisMonthTotal = thisMonthEntries.reduce((acc, e) => acc + e.amount, 0);

    return { averageDaily, thisMonthTotal, totalSpent };
  }, [book]);

  // Weekly totals (last 7 days including today, oldest->newest)
  const last7Totals = useMemo(() => {
    const cal = new Date();
    const arr: { date: Date; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const total = (book[key] || []).reduce((s, e) => s + e.amount, 0);
      arr.push({ date: d, total });
    }
    return arr;
  }, [book]);

  // ---------- Load from storage on mount ----------
  useEffect(() => {
    (async () => {
      try {
        const [bStr, qStr, bookStr, catStr, currStr] = await Promise.all([
          AsyncStorage.getItem(KEY_BUDGET),
          AsyncStorage.getItem(KEY_QUICK),
          AsyncStorage.getItem(KEY_BOOK),
          AsyncStorage.getItem(KEY_CATEGORIES),
          AsyncStorage.getItem(KEY_CURRENCY),
        ]);
        if (bStr != null) setDailyBudget(parseFloat(bStr));
        if (qStr != null) setQuickAmounts(JSON.parse(qStr));
        if (bookStr != null) setBook(JSON.parse(bookStr));
        if (catStr != null) setCategories(JSON.parse(catStr));
        if (currStr != null) setCurrency(JSON.parse(currStr));
      } catch (e) {
        console.warn('Failed to load', e);
      }
    })();
  }, []);

  // ---------- Persist when things change ----------
  useEffect(() => { AsyncStorage.setItem(KEY_BUDGET, String(dailyBudget)); }, [dailyBudget]);
  useEffect(() => { AsyncStorage.setItem(KEY_QUICK, JSON.stringify(quickAmounts)); }, [quickAmounts]);
  useEffect(() => { AsyncStorage.setItem(KEY_BOOK, JSON.stringify(book)); }, [book]);
  useEffect(() => { AsyncStorage.setItem(KEY_CATEGORIES, JSON.stringify(categories)); }, [categories]);
  useEffect(() => { AsyncStorage.setItem(KEY_CURRENCY, JSON.stringify(currency)); }, [currency]);

  // Ensure today array exists
  useEffect(() => {
    setBook(prev => {
      if (prev[todayKey]) return prev;
      return { ...prev, [todayKey]: [] };
    });
  }, [todayKey]);

  const addAmount = useCallback((amt: number, category: string = selectedCategory, note: string = '') => {
    if (!(amt > 0)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBook(prev => {
      const arr = prev[todayKey] ? [...prev[todayKey]] : [];
      arr.push({
        id: Math.random().toString(36).slice(2),
        amount: amt,
        timestamp: Date.now(),
        category,
        note
      });
      return { ...prev, [todayKey]: arr };
    });
    setExpenseNote('');
    setShowAddExpense(false);
  }, [todayKey, selectedCategory]);

  const deleteExpense = useCallback((expenseId: string) => {
    setBook(prev => {
      const arr = prev[todayKey] ? [...prev[todayKey]] : [];
      const filtered = arr.filter(expense => expense.id !== expenseId);
      return { ...prev, [todayKey]: filtered };
    });
  }, [todayKey]);

  const clearToday = useCallback(() => {
    Alert.alert('Clear today?', 'This will remove all entries for today.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setBook(prev => ({ ...prev, [todayKey]: [] })) },
    ]);
  }, [todayKey]);

  const addQuickAmount = useCallback((v: number) => {
    setQuickAmounts(prev => Array.from(new Set([...prev, v])).sort((a, b) => a - b));
  }, []);

  const removeQuickAmount = useCallback((v: number) => {
    setQuickAmounts(prev => prev.filter(x => x !== v));
  }, []);

  // ---------- Export Functions ----------
  const exportData = useCallback(async (format: 'json' | 'csv') => {
    try {
      const allEntries = Object.values(book).flat();
      const sortedEntries = allEntries.sort((a, b) => b.timestamp - a.timestamp);

      if (format === 'json') {
        const dataStr = JSON.stringify(sortedEntries, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `expenses-${dateKey()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const headers = 'Date,Amount,Category,Note\n';
        const csvRows = sortedEntries.map(entry => {
          const date = new Date(entry.timestamp).toLocaleDateString();
          const amount = entry.amount.toFixed(2);
          const category = entry.category;
          const note = entry.note.replace(/,/g, ';'); // Replace commas to avoid CSV issues
          return `${date},${amount},${category},${note}`;
        });
        const csvContent = headers + csvRows.join('\n');
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `expenses-${dateKey()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export data. Please try again.');
    }
  }, [book]);

  // ---------- UI ----------
  if (showSplash) {
    return <SplashScreen onAnimationComplete={() => setShowSplash(false)} />;
  }

  return (
    <View style={styles.safe}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'default'} backgroundColor="#0b0b0c" />
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Pebble</Text>

          <View style={styles.progressContainer}>
            <ProgressRing progress={progress} remaining={remaining} budget={dailyBudget} currencySymbol={currency.symbol} />
          </View>

          {/* Spending Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg Daily</Text>
              <Text style={styles.summaryValue}>{fmtCurrency(spendingSummary.averageDaily, currency.symbol)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryValue}>{fmtCurrency(spendingSummary.thisMonthTotal, currency.symbol)}</Text>
            </View>
          </View>

          {/* Weekly History */}
          <WeeklyHistory dailyTotals={last7Totals} budget={dailyBudget} currencySymbol={currency.symbol} />

          {/* Add Expense */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Add Expense</Text>
            <Pressable onPress={() => setShowSettings(true)} style={styles.editBtn}><Text style={styles.editText}>Settings</Text></Pressable>
          </View>

          {!showAddExpense ? (
            <View style={styles.flowRow}>
              {quickAmounts.map(v => (
                <Pressable key={v} onPress={() => addAmount(v)} style={styles.chip}>
                  <Text style={styles.chipText}>{fmtCurrencyNoSymbol(v)}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowAddExpense(true)} style={[styles.chip, { backgroundColor: '#374151' }]}>
                <Text style={styles.chipText}>+ Custom</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.addExpenseForm}>
              {/* Amount Input */}
              <View style={styles.customRow}>
                <TextInput
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="decimal-pad"
                  placeholder="Amount"
                  placeholderTextColor="#999"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>

              {/* Category Selection */}
              <View style={styles.categoryRow}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {categories.map(cat => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat.id)}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: selectedCategory === cat.id ? cat.color : '#374151' }
                      ]}
                    >
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text style={styles.categoryText}>{cat.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Note Input */}
              <View style={styles.customRow}>
                <TextInput
                  value={expenseNote}
                  onChangeText={setExpenseNote}
                  placeholder="Note (optional)"
                  placeholderTextColor="#999"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <Pressable
                  onPress={() => {
                    setShowAddExpense(false);
                    setCustomAmount('');
                    setExpenseNote('');
                  }}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const parsed = parseFloat(customAmount.replace(',', '.'));
                    if (isNaN(parsed) || parsed <= 0) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    addAmount(parsed, selectedCategory, expenseNote);
                  }}
                  style={[styles.primaryBtn, { opacity: customAmount ? 1 : 0.6 }]}
                >
                  <Text style={styles.primaryText}>Add Expense</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Today list */}
          <Text style={styles.sectionTitle}>Today</Text>
          {todayEntries.length === 0 ? (
            <Text style={styles.emptyText}>No expenses yet. Tap a chip or add a custom.</Text>
          ) : (
            <FlatList
              data={[...todayEntries].sort((a, b) => b.timestamp - a.timestamp)}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const category = categories.find(cat => cat.id === item.category) || categories[0];
                return (
                  <View style={styles.expenseRow}>
                    <View style={styles.expenseLeft}>
                      <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                      <View style={styles.expenseDetails}>
                        <Text style={styles.rowText}>{fmtCurrency(item.amount, currency.symbol)}</Text>
                        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
                      </View>
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={styles.categoryName}>{category.icon} {category.name}</Text>
                      <Text style={styles.rowSub}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <Pressable
                      onPress={() => deleteExpense(item.id)}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteText}>🗑️</Text>
                    </Pressable>
                  </View>
                );
              }}
              scrollEnabled={false}
            />
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <View style={styles.actionsRow}>
              <Pressable onPress={clearToday} style={[styles.secondaryBtn, styles.dangerBtn]}><Text style={styles.secondaryText}>Clear Today</Text></Pressable>
            </View>
            <View style={styles.exportRow}>
              <Pressable onPress={() => exportData('csv')} style={styles.exportBtn}><Text style={styles.exportText}>📊 Export CSV</Text></Pressable>
              <Pressable onPress={() => exportData('json')} style={styles.exportBtn}><Text style={styles.exportText}>📄 Export JSON</Text></Pressable>
            </View>
          </View>

          {/* Settings Sheet (simple inline for single-file demo) */}
          {showSettings && (
            <View style={styles.sheetOverlay}>
              <View style={styles.sheet}>
                <Text style={styles.sheetTitle}>Settings</Text>

                <Text style={styles.label}>Daily budget</Text>
                <View style={styles.customRow}>
                  <TextInput
                    value={String(dailyBudget)}
                    onChangeText={(t) => setDailyBudget(parseFloat(t.replace(',', '.')) || 0)}
                    keyboardType="decimal-pad"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <Pressable onPress={() => setShowSettings(false)} style={[styles.primaryBtn, { marginLeft: 8 }]}>
                    <Text style={styles.primaryText}>Save</Text>
                  </Pressable>
                </View>

                <Text style={[styles.label, { marginTop: 12 }]}>Currency</Text>
                <View style={styles.currencyRow}>
                  {CURRENCY_OPTIONS.map(option => (
                    <Pressable
                      key={option.code}
                      onPress={() => setCurrency(option)}
                      style={[
                        styles.currencyChip,
                        { backgroundColor: currency.code === option.code ? '#2563eb' : '#374151' }
                      ]}
                    >
                      <Text style={styles.currencyText}>{option.symbol} {option.code}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 12 }]}>Quick amounts</Text>
                <View style={styles.flowRow}>
                  {quickAmounts.map(v => (
                    <View key={v} style={[styles.chip, { flexDirection: 'row', gap: 6 }]}>
                      <Text style={styles.chipText}>{fmtCurrencyNoSymbol(v)}</Text>
                      <Pressable onPress={() => removeQuickAmount(v)}><Text style={{ color: '#c00', fontWeight: '700' }}>×</Text></Pressable>
                    </View>
                  ))}
                </View>
                <View style={styles.customRow}>
                  <TextInput placeholder="Add amount" placeholderTextColor="#999" keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} onSubmitEditing={(e) => {
                    const v = parseFloat(e.nativeEvent.text.replace(',', '.'));
                    if (v > 0) addQuickAmount(v);
                  }} />
                </View>

                <View style={styles.settingsDoneContainer}>
                  <Pressable onPress={() => setShowSettings(false)} style={[styles.secondaryBtn, { alignSelf: 'flex-end' }]}>
                    <Text style={styles.secondaryText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------- Progress Ring ----------
function ProgressRing({ progress, remaining, budget, currencySymbol }: { progress: number; remaining: number; budget: number; currencySymbol: string }) {
  const size = 200;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, progress));
  const color = progress < 0.7 ? '#10b981' : progress < 1 ? '#f59e0b' : '#ef4444'; // green / orange / red

  return (
    <View>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#eee" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', height: size, width: size }}>
        <Text style={{ color: '#666', fontSize: 12 }}>Remaining</Text>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>{fmtCurrency(remaining, currencySymbol)}</Text>
        <Text style={{ color: '#666' }}>of {fmtCurrency(budget, currencySymbol)}</Text>
      </View>
    </View>
  );
}

// ---------- Spending Summary ----------
function SpendingSummary({ averageDaily, thisMonthTotal, currencySymbol }: { averageDaily: number; thisMonthTotal: number; currencySymbol: string }) {
  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Avg Daily</Text>
        <Text style={styles.summaryValue}>{fmtCurrency(averageDaily, currencySymbol)}</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>This Month</Text>
        <Text style={styles.summaryValue}>{fmtCurrency(thisMonthTotal, currencySymbol)}</Text>
      </View>
    </View>
  );
}

// ---------- Weekly History ----------
function WeeklyHistory({ dailyTotals, budget, currencySymbol }: { dailyTotals: { date: Date; total: number }[]; budget: number; currencySymbol: string }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.sectionTitle}>This Week</Text>
        {/* optional 7-day sum */}
        <Text style={{ color: '#666', fontSize: 12 }}>{fmtCurrency(dailyTotals.reduce((s, d) => s + d.total, 0), currencySymbol)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginTop: 8 }}>
        {dailyTotals.map(({ date, total }, idx) => {
          const ratio = Math.max(0, Math.min(1, budget > 0 ? total / budget : 0));
          const height = Math.max(6, 80 * ratio);
          const color = total <= budget ? 'rgba(59,130,246,0.85)' : 'rgba(239,68,68,0.95)'; // blue vs red
          return (
            <View key={idx} style={{ alignItems: 'center', width: 24 }}>
              <View style={{ width: 22, height, backgroundColor: color, borderRadius: 6 }} />
              <Text style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{weekdayShort(date)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0b0c' },
  container: { padding: 20, paddingTop: 40, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: '800', color: 'white', marginBottom: 20, marginTop: 10 },
  progressContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: 'white', marginTop: 24, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 24, marginBottom: 8 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#1f2937', borderRadius: 999 },
  editText: { color: '#93c5fd', fontWeight: '600' },
  flowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginTop: 12 },
  chip: { backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  chipText: { color: 'white', fontWeight: '700' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginTop: 12 },
  input: { flex: 0.6, backgroundColor: '#111827', color: 'white', paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8, borderRadius: 10 },
  primaryBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  primaryText: { color: 'white', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  secondaryText: { color: '#e5e7eb', fontWeight: '700' },
  emptyText: { color: '#9ca3af', paddingHorizontal: 16, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomColor: '#111827', borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { color: 'white', fontSize: 16, fontWeight: '700' },
  rowSub: { color: '#9ca3af' },
  actionsContainer: { paddingHorizontal: 16, marginTop: 24, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportBtn: { backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flex: 1 },
  exportText: { color: '#93c5fd', fontWeight: '600', fontSize: 12, textAlign: 'center' },
  dangerBtn: { backgroundColor: '#7f1d1d' },
  sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: '#0b0b0c', borderRadius: 14, padding: 24, borderColor: '#1f2937', borderWidth: 1 },
  sheetTitle: { color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { color: '#9ca3af', marginBottom: 12, marginTop: 16 },
  settingsDoneContainer: { marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#1f2937' },
  addExpenseForm: { paddingHorizontal: 16, marginTop: 16 },
  categoryRow: { marginTop: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  categoryIcon: { fontSize: 16 },
  categoryText: { color: 'white', fontWeight: '600', fontSize: 12 },
  actionButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomColor: '#111827', borderBottomWidth: StyleSheet.hairlineWidth },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  expenseDetails: { flex: 1 },
  expenseNote: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end' },
  categoryName: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  deleteBtn: { padding: 8, marginLeft: 8 },
  deleteText: { fontSize: 16 },
  summaryContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 16, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#111827', padding: 12, borderRadius: 10, alignItems: 'center' },
  summaryLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
  summaryValue: { color: 'white', fontSize: 16, fontWeight: '700' },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  currencyChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  currencyText: { color: 'white', fontWeight: '600', fontSize: 12 },
});
