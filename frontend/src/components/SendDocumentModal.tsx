// src/components/SendDocumentModal.tsx
// Reusable "Send to patient" dialog: generates the relevant document (best-effort)
// and queues an SMS/WhatsApp message via the communications API.
import { useEffect, useState } from 'react';
import { X, MessageSquare, Send, Loader, Phone } from 'lucide-react';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { getPatientName } from '../utils/patient';
import {
  sendMessage,
  generateReceipt,
  generatePrescription,
  generateLabResult,
} from '../api';

export type SendDocType = 'receipt' | 'prescription' | 'lab-result' | 'scan-result' | 'general';

interface SendDocumentModalProps {
  open: boolean;
  onClose: () => void;
  patient: any;
  documentType: SendDocType;
  entityId?: string; // billId for receipt; attendanceId/encounterId for prescription/lab-result
  defaultMessage?: string;
}

const DOC_LABEL: Record<SendDocType, string> = {
  receipt: 'Payment Receipt',
  prescription: 'Prescription',
  'lab-result': 'Lab Results',
  'scan-result': 'Scan Results',
  general: 'Message',
};

export default function SendDocumentModal({ open, onClose, patient, documentType, entityId, defaultMessage }: SendDocumentModalProps) {
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();

  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const hospitalName = hospital?.name || 'our facility';
  const patientName = getPatientName(patient);

  useEffect(() => {
    if (!open) return;
    setRecipient(patient?.contact || patient?.phone || '');
    setChannel('sms');
    if (defaultMessage) {
      setMessage(defaultMessage);
      return;
    }
    const firstName = (patientName || 'Patient').split(' ')[0];
    const templates: Record<SendDocType, string> = {
      receipt: `Dear ${firstName}, your payment receipt from ${hospitalName} is ready. Thank you for your visit.`,
      prescription: `Dear ${firstName}, your prescription from ${hospitalName} is ready. Please proceed to the pharmacy to collect your medication.`,
      'lab-result': `Dear ${firstName}, your laboratory results from ${hospitalName} are ready. Kindly visit or contact us to collect them.`,
      'scan-result': `Dear ${firstName}, your scan/imaging results from ${hospitalName} are ready. Kindly visit or contact us to collect them.`,
      general: `Dear ${firstName}, you have a message from ${hospitalName}.`,
    };
    setMessage(templates[documentType]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentType, patient?.id, defaultMessage]);

  if (!open) return null;

  // Best-effort document generation so the artifact is recorded server-side.
  const generateDoc = async () => {
    if (!entityId) return;
    try {
      if (documentType === 'receipt') await generateReceipt(entityId);
      else if (documentType === 'prescription') await generatePrescription(entityId);
      else if (documentType === 'lab-result') await generateLabResult(entityId);
    } catch {
      // Non-fatal: still queue the message even if generation isn't available.
    }
  };

  const handleSend = async () => {
    if (!recipient.trim()) {
      toastError('Recipient required', 'Enter a phone number to send to.');
      return;
    }
    if (!message.trim()) {
      toastError('Message required', 'Enter a message to send.');
      return;
    }
    setSending(true);
    try {
      await generateDoc();
      await sendMessage(channel, {
        recipient: recipient.trim(),
        message: message.trim(),
        metadata: { documentType, entityId, patientId: patient?.id },
      });
      success('Message queued', `${DOC_LABEL[documentType]} notification queued via ${channel.toUpperCase()} to ${recipient.trim()}.`);
      onClose();
    } catch (e: any) {
      toastError('Send failed', e?.response?.data?.message || e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Send {DOC_LABEL[documentType]}</h3>
              <p className="text-xs text-gray-500">{patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Channel */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Channel</label>
            <div className="flex gap-2">
              {(['sms', 'whatsapp'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    channel === c ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {c === 'sms' ? 'SMS' : 'WhatsApp'}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Recipient phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. +233241234567"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
            {!patient?.contact && !patient?.phone && (
              <p className="text-xs text-amber-600 mt-1">No contact on file for this patient — enter one.</p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{message.length} characters</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
