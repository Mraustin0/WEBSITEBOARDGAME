// รีวิวเกมหลังเล่น (ใช้ ReviewForm ร่วมกับหน้าคลังเกม)
import Modal from './Modal.jsx';
import { GameCover } from './ui.jsx';
import ReviewForm from '../ReviewForm.jsx';

export default function ReviewModal({ game, initial, afterReturn = false, onClose, onSaved }) {
  return (
    <Modal
      eyebrow={afterReturn ? 'คืนเกมแล้ว — ขอบคุณที่มาเล่น' : 'รีวิวเกม'}
      title={initial ? 'แก้รีวิวของคุณ' : 'เกมนี้สนุกแค่ไหน?'}
      onClose={onClose}
      size="max-w-md"
    >
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-ink/10 bg-cream-light p-3">
        <GameCover game={game} className="h-14 w-14" />
        <div className="min-w-0">
          <p className="truncate font-heading text-lg text-forest">{game.name}</p>
          {afterReturn && (
            <p className="text-xs text-slate-600">
              ให้คะแนนเพื่อช่วยเพื่อนสมาชิกเลือกเกม (ข้ามได้)
            </p>
          )}
        </div>
      </div>
      <ReviewForm gameId={game._id} initial={initial} onSaved={onSaved} onCancel={onClose} />
    </Modal>
  );
}
