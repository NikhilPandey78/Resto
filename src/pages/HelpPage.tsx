import { useState } from 'react';
import {
  LifeBuoy, MessageSquare, Plus, Mail, Phone, ChevronDown, ChevronUp,
  Ticket, Send, Clock, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Card, Button, Input, Textarea, Badge, Select } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/PageHeader';
import { formatRelativeTime } from '@/lib/utils';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high';
  description: string;
  created_at: string;
  messages: { from: 'user' | 'support'; text: string; time: string }[];
}

const faqs = [
  { q: 'How do I add a new inventory item?', a: 'Go to Inventory from the sidebar, click "Add Item", fill in the item details like name, category, unit, and stock levels, then save.' },
  { q: 'How does stock receiving work?', a: 'Navigate to Stock In, create a new receipt with the supplier and items received. Stock quantities update automatically after saving.' },
  { q: 'How do I set up recipes and menu items?', a: 'First create a recipe with ingredients in the Recipes page. Then create a menu item and link the recipe to automatically calculate food cost.' },
  { q: 'What happens when my subscription expires?', a: 'Operational features are blocked when expired, but your data is preserved. Renew your subscription to restore full access.' },
  { q: 'How do I transfer stock between branches?', a: 'Use the Stock Transfer page to move items between locations. Select source and destination branches, add items, and submit.' },
  { q: 'Can I export reports?', a: 'Yes. Go to Reports, select a report type, apply filters, and use the Export CSV or Print buttons.' },
];

const sampleTickets: Ticket[] = [
  { id: 'TKT-001', subject: 'Cannot receive stock for PO-1025', category: 'Stock Issue', status: 'resolved', priority: 'high', description: 'Getting an error when trying to receive partial order.', created_at: new Date(Date.now() - 3 * 86400000).toISOString(), messages: [
    { from: 'user', text: 'I cannot receive partial stock for PO-1025.', time: new Date(Date.now() - 3 * 86400000).toISOString() },
    { from: 'support', text: 'This has been fixed. You can now receive partial quantities.', time: new Date(Date.now() - 2 * 86400000).toISOString() },
  ]},
  { id: 'TKT-002', subject: 'How to set up unit conversions?', category: 'Question', status: 'open', priority: 'normal', description: 'Need help configuring box to piece conversion.', created_at: new Date(Date.now() - 86400000).toISOString(), messages: [
    { from: 'user', text: 'How do I set up 1 Box = 24 Pieces?', time: new Date(Date.now() - 86400000).toISOString() },
  ]},
];

const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'info' | 'neutral'; label: string }> = {
  open: { variant: 'warning', label: 'Open' },
  in_progress: { variant: 'info', label: 'In Progress' },
  resolved: { variant: 'success', label: 'Resolved' },
  closed: { variant: 'neutral', label: 'Closed' },
};

export function HelpPage() {
  const { restaurantUser } = useAuth();
  const toast = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [tickets, setTickets] = useState<Ticket[]>(sampleTickets);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'Technical Issue', priority: 'normal', description: '' });
  const [reply, setReply] = useState('');

  const handleCreateTicket = async () => {
    if (!form.subject || !form.description) { toast('Subject and description are required', 'error'); return; }
    setSaving(true);
    const count = tickets.length + 1;
    const newTicket: Ticket = {
      id: `TKT-${String(count).padStart(3, '0')}`,
      subject: form.subject,
      category: form.category,
      status: 'open',
      priority: form.priority as 'low' | 'normal' | 'high',
      description: form.description,
      created_at: new Date().toISOString(),
      messages: [{ from: 'user', text: form.description, time: new Date().toISOString() }],
    };
    setTickets([newTicket, ...tickets]);
    setSaving(false);
    toast('Support ticket created successfully.', 'success');
    setShowNewTicket(false);
    setForm({ subject: '', category: 'Technical Issue', priority: 'normal', description: '' });
  };

  const handleSendReply = () => {
    if (!reply.trim() || !viewTicket) return;
    const updated = tickets.map((t) => t.id === viewTicket.id ? {
      ...t,
      messages: [...t.messages, { from: 'user' as const, text: reply, time: new Date().toISOString() }],
    } : t);
    setTickets(updated);
    setViewTicket(updated.find((t) => t.id === viewTicket.id) || null);
    setReply('');
    toast('Reply sent.', 'success');
  };

  return (
    <div className="animate-page">
      <PageHeader title="Help & Support" description="Get help with your restaurant management" action={<Button onClick={() => setShowNewTicket(true)}><Plus className="h-4 w-4" /> New Ticket</Button>} />

      {/* Contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 text-center hover:shadow-md transition-shadow">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 mx-auto mb-3"><Mail className="h-6 w-6 text-blue-600" /></div>
          <p className="text-sm font-bold text-slate-900">Email Support</p>
          <p className="text-xs text-slate-500 mt-1">support@spicegarden.in</p>
          <p className="text-xs text-slate-400 mt-1">Response within 24 hours</p>
        </Card>
        <Card className="p-5 text-center hover:shadow-md transition-shadow">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 mx-auto mb-3"><Phone className="h-6 w-6 text-emerald-600" /></div>
          <p className="text-sm font-bold text-slate-900">Phone Support</p>
          <p className="text-xs text-slate-500 mt-1">+91 80 4567 8900</p>
          <p className="text-xs text-slate-400 mt-1">Mon-Sat, 9 AM - 8 PM IST</p>
        </Card>
        <Card className="p-5 text-center hover:shadow-md transition-shadow">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 mx-auto mb-3"><LifeBuoy className="h-6 w-6 text-violet-600" /></div>
          <p className="text-sm font-bold text-slate-900">Help Center</p>
          <p className="text-xs text-slate-500 mt-1">Browse our knowledge base</p>
          <p className="text-xs text-slate-400 mt-1">Guides, tutorials, and tips</p>
        </Card>
      </div>

      {/* FAQ */}
      <Card className="p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-900">{f.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-slate-600 animate-slide-up">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Support Tickets */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Ticket className="h-4 w-4 text-slate-400" /> Support Tickets</h3>
        {tickets.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">No support tickets yet.</div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => {
              const cfg = statusConfig[t.status];
              return (
                <div
                  key={t.id}
                  onClick={() => setViewTicket(t)}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{t.id}</span>
                      <p className="text-sm font-semibold text-slate-900 truncate">{t.subject}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{t.category} • {formatRelativeTime(t.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={t.priority === 'high' ? 'danger' : 'neutral'}>{t.priority}</Badge>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* New Ticket Modal */}
      <Modal
        open={showNewTicket}
        onClose={() => setShowNewTicket(false)}
        title="New Support Ticket"
        size="lg"
        footer={<><Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancel</Button><Button onClick={handleCreateTicket} loading={saving}>Create Ticket</Button></>}
      >
        <div className="space-y-4">
          <Input label="Subject *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Briefly describe the issue" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Technical Issue</option>
              <option>Billing Question</option>
              <option>Feature Request</option>
              <option>Question</option>
              <option>Other</option>
            </Select>
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </Select>
          </div>
          <Textarea label="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe your issue in detail" />
        </div>
      </Modal>

      {/* View Ticket Modal */}
      <Modal
        open={!!viewTicket}
        onClose={() => setViewTicket(null)}
        title={viewTicket?.subject || ''}
        size="lg"
      >
        {viewTicket && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-400">{viewTicket.id}</span>
              <Badge variant={statusConfig[viewTicket.status].variant}>{statusConfig[viewTicket.status].label}</Badge>
              <Badge variant={viewTicket.priority === 'high' ? 'danger' : 'neutral'}>{viewTicket.priority}</Badge>
              <span className="text-xs text-slate-400">{formatRelativeTime(viewTicket.created_at)}</span>
            </div>
            <div className="space-y-3">
              {viewTicket.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${m.from === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <p className="text-sm">{m.text}</p>
                    <p className={`text-xs mt-1 ${m.from === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>{formatRelativeTime(m.time)}</p>
                  </div>
                </div>
              ))}
            </div>
            {viewTicket.status !== 'closed' && viewTicket.status !== 'resolved' && (
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." onKeyDown={(e) => e.key === 'Enter' && handleSendReply()} />
                <Button onClick={handleSendReply}><Send className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
