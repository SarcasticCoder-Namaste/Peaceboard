import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAvatar, AVATAR_EMOJIS, AVATAR_COLORS } from "@/hooks/useAvatar";
import { Check, X } from "lucide-react";

export default function AvatarPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { avatar, setAvatar } = useAvatar(user?.id);
  const [draft, setDraft] = useState(avatar);

  const save = () => {
    setAvatar(draft);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 8, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Choose your avatar</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Preview */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${draft.color} flex items-center justify-center text-3xl shadow-md`}
                >
                  {draft.emoji}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  This will appear in the top nav and on your profile.
                </div>
              </div>

              {/* Emoji grid */}
              <section>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Emoji</h4>
                <div className="grid grid-cols-10 gap-1">
                  {AVATAR_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setDraft((d) => ({ ...d, emoji: e }))}
                      className={`aspect-square rounded-lg text-lg flex items-center justify-center transition-all ${
                        draft.emoji === e
                          ? "bg-primary/15 ring-2 ring-primary/60"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </section>

              {/* Color grid */}
              <section>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Color</h4>
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDraft((d) => ({ ...d, color: c }))}
                      className={`aspect-square rounded-full bg-gradient-to-br ${c} flex items-center justify-center transition-transform ${
                        draft.color === c ? "ring-2 ring-offset-2 ring-primary scale-105" : "hover:scale-105"
                      }`}
                      aria-label="Pick color"
                    >
                      {draft.color === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
