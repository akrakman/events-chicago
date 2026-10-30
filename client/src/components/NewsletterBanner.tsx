import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
  Terminal,
  Copy,
  Check,
  Eye,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import {
  fetchNewsletterPreview,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  sendTestNewsletterNow,
} from '../api';
import { WeeklyNewsletterDigest } from '../types';

const NEWSLETTER_EMAIL_KEY = 'jewish_events_newsletter_email';
const EMAIL_API_KEY_STORAGE = 'jewish_events_resend_api_key';
const SENDER_EMAIL_STORAGE = 'jewish_events_sender_email';

function sanitizeEmailApiKey(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const brevoMatch = trimmed.match(/xkeysib-[A-Za-z0-9_-]+/);
  if (brevoMatch) return brevoMatch[0];
  const resendMatch = trimmed.match(/re_[A-Za-z0-9]{8}_[A-Za-z0-9]{24}/);
  if (resendMatch) return resendMatch[0];
  return trimmed;
}

export const NewsletterBanner: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem(NEWSLETTER_EMAIL_KEY);
    } catch {
      return null;
    }
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      const cleaned = sanitizeEmailApiKey(localStorage.getItem(EMAIL_API_KEY_STORAGE));
      if (cleaned) {
        localStorage.setItem(EMAIL_API_KEY_STORAGE, cleaned);
      }
      return cleaned;
    } catch {
      return '';
    }
  });
  const [senderEmail, setSenderEmail] = useState<string>(() => {
    try {
      return localStorage.getItem(SENDER_EMAIL_STORAGE) || 'akrakman@gmail.com';
    } catch {
      return 'akrakman@gmail.com';
    }
  });
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingSend, setIsTestingSend] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastDeliveryMode, setLastDeliveryMode] = useState<string | null>(null);
  const [lastTestSentTo, setLastTestSentTo] = useState<string | null>(null);
  const [lastTestSentAt, setLastTestSentAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<WeeklyNewsletterDigest | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<'email' | 'list' | 'text'>('email');
  const [copiedHtml, setCopiedHtml] = useState(false);

  useEffect(() => {
    fetchNewsletterPreview()
      .then((res) => {
        setDigest(res.digest);
        setSubscriberCount(res.subscriberCount);
      })
      .catch(() => {});
  }, []);

  const handleSaveApiKey = (val: string) => {
    const cleaned = sanitizeEmailApiKey(val);
    setApiKey(cleaned);
    try {
      if (cleaned) {
        localStorage.setItem(EMAIL_API_KEY_STORAGE, cleaned);
      } else {
        localStorage.removeItem(EMAIL_API_KEY_STORAGE);
      }
    } catch {}
  };

  const handleSaveSenderEmail = (val: string) => {
    setSenderEmail(val);
    try {
      if (val.trim()) {
        localStorage.setItem(SENDER_EMAIL_STORAGE, val.trim());
      }
    } catch {}
  };

  const copyStyledHtmlToClipboard = async (targetDigest: WeeklyNewsletterDigest): Promise<boolean> => {
    if (!targetDigest.html) return false;
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const htmlBlob = new Blob([targetDigest.html], { type: 'text/html' });
        const textBlob = new Blob([targetDigest.text || ''], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 3000);
        return true;
      }
    } catch {}
    return false;
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await subscribeToNewsletter(
        trimmed,
        apiKey.trim() || undefined,
        senderEmail.trim() || undefined
      );
      const cleanEmail = trimmed.toLowerCase();
      setSubscribedEmail(cleanEmail);
      try {
        localStorage.setItem(NEWSLETTER_EMAIL_KEY, cleanEmail);
      } catch {}
      setEmail('');
      setSubscriberCount(res.subscriberCount);
      if (res.digest) {
        setDigest(res.digest);
      }
      setLastTestSentTo(cleanEmail);
      setLastTestSentAt(new Date().toLocaleTimeString());
      setLastDeliveryMode(res.deliveryMode || 'DEV_SIMULATOR');

      if (res.deliveryMode === 'BREVO_API') {
        setStatusMessage(
          `✅ Subscribed ${cleanEmail} & delivered the styled HTML newsletter directly to ${cleanEmail} via Brevo!`
        );
      } else if (res.deliveryMode === 'RESEND_API') {
        setStatusMessage(
          `✅ Subscribed ${cleanEmail} & sent the styled HTML newsletter via Resend!`
        );
      } else {
        setShowKeyConfig(true);
        if (res.deliveryError) setError(res.deliveryError);
        setStatusMessage(
          `✅ Subscribed ${cleanEmail} for Sundays at 9:00 AM CT! Add a free Brevo API key (xkeysib-...) below to send styled HTML emails to any user without needing a custom domain.`
        );
      }
      setPreviewTab('email');
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestSendNow = async () => {
    const targetEmail = (email.trim() || subscribedEmail || 'akrakman1@gmail.com').toLowerCase();
    setIsTestingSend(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await sendTestNewsletterNow(
        targetEmail,
        apiKey.trim() || undefined,
        senderEmail.trim() || undefined
      );
      const activeDigest = res.digest || digest;
      if (res.digest) {
        setDigest(res.digest);
      }
      if (email.trim()) {
        setSubscribedEmail(targetEmail);
        try {
          localStorage.setItem(NEWSLETTER_EMAIL_KEY, targetEmail);
        } catch {}
        setEmail('');
      }
      const deliveredTo = res.recipients?.[0] || targetEmail;
      setLastTestSentTo(deliveredTo);
      setLastTestSentAt(new Date().toLocaleTimeString());
      setLastDeliveryMode(res.deliveryMode);

      if (res.deliveryMode === 'BREVO_API') {
        setShowKeyConfig(false);
        setStatusMessage(
          `✅ Sent the fully styled HTML email (${res.eventsCount} events) to ${deliveredTo} via Brevo API! Check ${deliveredTo}'s inbox.`
        );
      } else if (res.deliveryMode === 'RESEND_API') {
        setShowKeyConfig(false);
        setStatusMessage(
          deliveredTo !== targetEmail
            ? `✅ Sent the styled HTML email (${res.eventsCount} events) to ${deliveredTo} via Resend! (To send to ${targetEmail} or any other user without a custom domain, paste a free Brevo API key xkeysib-... in Email Settings below).`
            : `✅ Sent the fully styled HTML email (${res.eventsCount} events) to ${deliveredTo} via Resend API! Check your inbox.`
        );
      } else {
        if (activeDigest) {
          await copyStyledHtmlToClipboard(activeDigest);
        }
        setShowKeyConfig(true);
        if (res.deliveryError) {
          setError(res.deliveryError);
        }
        setStatusMessage(
          `⚡ Rendered the styled HTML email for ${targetEmail} below! Paste a free Brevo API key (xkeysib-...) below to deliver styled HTML emails to any email address.`
        );
      }
      setPreviewTab('email');
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger test newsletter');
    } finally {
      setIsTestingSend(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!subscribedEmail) return;
    try {
      await unsubscribeFromNewsletter(subscribedEmail);
      try {
        localStorage.removeItem(NEWSLETTER_EMAIL_KEY);
      } catch {}
      setSubscribedEmail(null);
      setStatusMessage('You have unsubscribed from the weekly Sunday 9:00 AM newsletter.');
    } catch (err: any) {
      setError(err.message || 'Failed to unsubscribe');
    }
  };

  const handleCopyAndOpenGmail = async () => {
    if (digest) {
      await copyStyledHtmlToClipboard(digest);
    }
    const activeRecipient = lastTestSentTo || subscribedEmail || email.trim() || 'akrakman1@gmail.com';
    const subject = digest?.subject || 'Chicago Jewish Events This Week';
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        activeRecipient
      )}&su=${encodeURIComponent(subject)}`,
      '_blank'
    );
  };

  const activeRecipient = lastTestSentTo || subscribedEmail || email.trim() || 'akrakman1@gmail.com';
  const isBrevoKey = apiKey.startsWith('xkeysib-');

  return (
    <div
      id="newsletter-section"
      className="bg-white border-2 border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Description */}
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Mail className="w-3 h-3 text-emerald-600" />
              <span>Weekly Email Newsletter</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Sent Sundays at 9:00 AM CT</span>
            </span>
            {subscriberCount > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                • {subscriberCount} {subscriberCount === 1 ? 'subscriber' : 'subscribers'}
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
            Get This Week’s Upcoming Chicago Jewish Events in Your Inbox
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Enter your email to receive a curated list of upcoming events for the week every{' '}
            <strong className="text-slate-800">Sunday at 9:00 AM</strong> — or use{' '}
            <strong className="text-emerald-700">⚡ Test Send Now (Dev)</strong> to trigger &amp; inspect the styled HTML email right now.
          </p>
        </div>

        {/* Right: Email Signup Form + Instant Dev Test Trigger */}
        <div className="w-full lg:w-auto flex-shrink-0 space-y-2">
          {subscribedEmail ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="text-xs min-w-0">
                    <span className="font-bold text-emerald-950 block truncate">{subscribedEmail}</span>
                    <span className="text-[10px] text-emerald-700 block">
                      Subscribed • Sundays at 9:00 AM CT
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 underline flex-shrink-0"
                >
                  Change / Unsubscribe
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestSendNow}
                disabled={isTestingSend}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition whitespace-nowrap"
                title="Trigger Sunday 9am newsletter job right now"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isTestingSend ? 'Sending Test...' : '⚡ Test Send Now (Dev)'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:w-60">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs shadow-xs shadow-emerald-600/20 transition whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Subscribing...' : 'Subscribe Weekly'}</span>
              </button>
              <button
                type="button"
                onClick={handleTestSendNow}
                disabled={isTestingSend}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition whitespace-nowrap"
                title="Test sending the weekly newsletter right now without waiting until Sunday"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isTestingSend ? 'Testing...' : '⚡ Test Send Now (Dev)'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Status or Error Messages */}
      {statusMessage && (
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5 sm:mt-0" />
            <span>{statusMessage}</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowKeyConfig(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] transition whitespace-nowrap"
            >
              Configure Brevo (Send to Any User)
            </button>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview Toggle Bar */}
      {digest && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">
            This week’s Sunday 9:00 AM digest includes{' '}
            <strong className="text-slate-800">{digest.eventsCount} upcoming events</strong> ({digest.weekRangeLabel})
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <KeyRound className="w-3 h-3 text-amber-600" />
              <span>
                {isBrevoKey
                  ? 'Brevo API Active (All Users) ✓'
                  : apiKey
                  ? 'Email API Key Active ✓ (Switch to Brevo for All Users)'
                  : 'Configure Brevo API Key (Send to Any Email)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'Hide Newsletter Inspector' : 'Preview & Inspect Weekly Email'}</span>
              {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Brevo / Resend API Key Input for Direct Styled HTML Email Delivery to ANY User */}
      {showKeyConfig && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5 text-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <strong className="text-slate-900 block">
                Send Styled HTML Newsletters to Any User (Brevo Free API — No Custom Domain Required)
              </strong>
              <ol className="list-decimal list-inside text-[11px] text-slate-700 space-y-0.5">
                <li>
                  Create a free account at{' '}
                  <a
                    href="https://app.brevo.com/settings/keys/api"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 underline font-bold"
                  >
                    app.brevo.com/settings/keys/api
                  </a>{' '}
                  (using your Gmail, e.g. <code>akrakman@gmail.com</code>).
                </li>
                <li>
                  Click <strong>Generate a new API key</strong>, copy the key starting with <code>xkeysib-...</code>, and paste it below.
                </li>
              </ol>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => handleSaveSenderEmail(e.target.value)}
                placeholder="Verified Brevo Sender (e.g. akrakman@gmail.com)"
                title="The Gmail address you signed up with on Brevo"
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 w-48 focus:outline-none focus:border-emerald-600"
              />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                placeholder="Paste xkeysib-... (or re_...)"
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 w-56 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={handleTestSendNow}
                disabled={isTestingSend || !apiKey.trim()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs whitespace-nowrap transition"
              >
                {isTestingSend ? 'Sending...' : 'Save & Test Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Developer Email Inbox Simulator & Preview */}
      {showPreview && digest && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner">
          {/* Top Simulator Toolbar */}
          <div className="px-4 py-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Newsletter Test &amp; Inbox Simulator (
                  {lastDeliveryMode === 'BREVO_API'
                    ? 'Sent Styled HTML via Brevo'
                    : lastDeliveryMode === 'RESEND_API'
                    ? 'Sent Styled HTML via Resend'
                    : 'Styled HTML Preview'}
                  )
                </span>
                <span className="text-xs text-slate-300">
                  {lastTestSentAt
                    ? `Delivered to ${activeRecipient} at ${lastTestSentAt}`
                    : 'Scheduled for Sunday at 9:00 AM CT'}
                </span>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPreviewTab('email')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  previewTab === 'email' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                📧 Rendered Email
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('list')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  previewTab === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                📋 Event List ({digest.eventsCount})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('text')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  previewTab === 'text' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                📄 Plain Text
              </button>
            </div>
          </div>

          {/* Email Envelope Metadata Header */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div>
                <span className="text-slate-400 font-medium">From:</span>{' '}
                <strong className="text-slate-700">
                  Chicago Jewish Events &lt;{isBrevoKey ? senderEmail : 'onboarding@resend.dev'}&gt;
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">To:</span>{' '}
                <strong className="text-emerald-700">{activeRecipient}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Subject:</span>{' '}
                <strong className="text-slate-900">{digest.subject}</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyStyledHtmlToClipboard(digest)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition"
                title="Copy the rich styled HTML email so you can paste (Cmd+V) it into Gmail with full styling"
              >
                {copiedHtml ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHtml ? 'Copied Styled HTML!' : 'Copy Styled HTML'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyAndOpenGmail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition"
                title="Copies the styled HTML to clipboard and opens Gmail Compose — just press Cmd+V in the email body!"
              >
                <Mail className="w-3 h-3" />
                <span>Copy Styled HTML &amp; Open Gmail ↗</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Rendered HTML Email View */}
          {previewTab === 'email' && (
            <div className="p-4 bg-slate-100 max-h-[480px] overflow-y-auto">
              {digest.html ? (
                <div
                  className="bg-white rounded-2xl shadow-xs overflow-hidden max-w-2xl mx-auto"
                  dangerouslySetInnerHTML={{ __html: digest.html }}
                />
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  Rendered email preview loaded ({digest.eventsCount} events).
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Interactive Event List */}
          {previewTab === 'list' && (
            <div className="divide-y divide-slate-200/80 max-h-96 overflow-y-auto">
              {digest.events.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3.5 bg-white hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                      <Calendar className="w-3 h-3" />
                      <span>{item.dateFormatted}</span>
                      {item.timeFormatted && <span>• {item.timeFormatted}</span>}
                      {item.neighborhood && (
                        <span className="inline-flex items-center gap-0.5 text-slate-600 font-medium">
                          • <MapPin className="w-2.5 h-2.5 text-rose-500" /> {item.neighborhood}
                        </span>
                      )}
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 hover:underline block truncate"
                    >
                      {item.title}
                    </a>
                    <p className="text-[11px] text-slate-500 truncate">
                      Host: <strong className="text-slate-700">{item.organization}</strong>
                      {item.location ? ` • ${item.location}` : ''}
                    </p>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex-shrink-0 self-start sm:self-center transition"
                  >
                    <span>RSVP</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Plain Text Email */}
          {previewTab === 'text' && (
            <pre className="p-4 bg-slate-950 text-slate-200 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-96 overflow-y-auto">
              {digest.text || 'No plain text digest available.'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
