import logging
import os
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk

from src import config, library, transcriber

logger = logging.getLogger(__name__)

WHISPER_MODELS = ["tiny", "base", "small", "medium", "large"]


class TranscriptorApp(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("Transcriptor")
        self.geometry("760x700")
        self.minsize(640, 560)

        self.selected_file = None
        self.whisper_model = tk.StringVar(value=config.DEFAULT_WHISPER_MODEL)
        self.hf_token = tk.StringVar(value=config.load_hf_token())
        self.status_text = tk.StringVar(value="Select an audio file to get started.")

        self._build_layout()
        self.refresh_library()

    def _build_layout(self):
        self._build_transcribe_section()
        self._build_library_section()

    def _build_transcribe_section(self):
        frame = ttk.LabelFrame(self, text="New transcription")
        frame.pack(fill="both", expand=True, padx=10, pady=10)

        file_row = ttk.Frame(frame)
        file_row.pack(fill="x", padx=10, pady=(10, 5))

        self.file_label = ttk.Label(file_row, text="No file selected", anchor="w")
        self.file_label.pack(side="left", fill="x", expand=True)

        ttk.Button(
            file_row, text="Select audio file", command=self.select_file
        ).pack(side="right")

        options_row = ttk.Frame(frame)
        options_row.pack(fill="x", padx=10, pady=5)

        ttk.Label(options_row, text="Whisper model:").pack(side="left")
        ttk.OptionMenu(
            options_row, self.whisper_model, self.whisper_model.get(), *WHISPER_MODELS
        ).pack(side="left", padx=(5, 20))

        ttk.Label(options_row, text="Hugging Face token (for speaker ID):").pack(
            side="left"
        )
        ttk.Entry(options_row, textvariable=self.hf_token, show="*", width=24).pack(
            side="left", padx=5
        )

        ttk.Label(
            frame,
            text=(
                "Without a token, every line is labeled \"Speaker 1\" (speaker "
                "identification is skipped). Get a free token at "
                "huggingface.co/settings/tokens and accept the terms for "
                "pyannote/speaker-diarization-3.1, pyannote/segmentation-3.0, "
                "and pyannote/speaker-diarization-community-1."
            ),
            wraplength=680,
            foreground="#666666",
            justify="left",
        ).pack(fill="x", padx=10, pady=(0, 5))

        action_row = ttk.Frame(frame)
        action_row.pack(fill="x", padx=10, pady=(5, 10))

        self.transcribe_button = ttk.Button(
            action_row, text="Transcribe", command=self.start_transcription
        )
        self.transcribe_button.pack(side="left")

        self.progress = ttk.Progressbar(action_row, mode="determinate", maximum=100)
        self.progress.pack(side="left", fill="x", expand=True, padx=10)

        ttk.Label(frame, textvariable=self.status_text, anchor="w").pack(
            fill="x", padx=10, pady=(0, 5)
        )

        ttk.Label(frame, text="Live transcript:", anchor="w").pack(
            fill="x", padx=10, pady=(0, 2)
        )

        self.transcript_text = scrolledtext.ScrolledText(
            frame, height=10, wrap="word", state="disabled"
        )
        self.transcript_text.pack(fill="both", expand=True, padx=10, pady=(0, 10))

    def _build_library_section(self):
        frame = ttk.LabelFrame(self, text="Transcription library")
        frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        # Packed first with side="bottom" so this row always keeps its space
        # reserved, even if the window is too short to fit the treeview at
        # its natural size (otherwise the treeview's expand="True" can push
        # this row out of the visible area).
        button_row = ttk.Frame(frame)
        button_row.pack(side="bottom", fill="x", padx=10, pady=(0, 10))

        ttk.Button(
            button_row, text="Open file folder", command=self.open_selected_folder
        ).pack(side="left")

        self.reidentify_button = ttk.Button(
            button_row,
            text="Run speaker identification again",
            command=self.reidentify_selected,
        )
        self.reidentify_button.pack(side="left", padx=5)

        ttk.Button(button_row, text="Refresh", command=self.refresh_library).pack(
            side="left", padx=5
        )

        columns = ("filename", "modified")
        self.tree = ttk.Treeview(frame, columns=columns, show="headings")
        self.tree.heading("filename", text="File")
        self.tree.heading("modified", text="Last modified")
        self.tree.column("filename", width=420)
        self.tree.column("modified", width=160)
        self.tree.pack(fill="both", expand=True, padx=10, pady=10)
        self.tree.bind("<Double-1>", lambda _event: self.open_selected_folder())

    def select_file(self):
        path = filedialog.askopenfilename(
            title="Select an audio file",
            filetypes=[
                ("Audio files", " ".join(f"*{ext}" for ext in config.SUPPORTED_AUDIO_EXTENSIONS)),
                ("All files", "*.*"),
            ],
        )
        if not path:
            return

        self.selected_file = path
        self.file_label.config(text=os.path.basename(path))
        self.status_text.set("Ready to transcribe.")
        logger.info("Selected audio file: %s", path)

    def start_transcription(self):
        if not self.selected_file:
            messagebox.showwarning("No file selected", "Please select an audio file first.")
            return

        token = self.hf_token.get().strip()

        if not token:
            proceed = messagebox.askyesno(
                "No Hugging Face token",
                "No Hugging Face token was provided, so speaker identification "
                "will be skipped and everyone will be labeled \"Speaker 1\".\n\n"
                "Continue anyway?",
            )
            if not proceed:
                return

        config.save_hf_token(token)

        logger.info(
            "Starting transcription: file=%s model=%s speaker_id=%s",
            self.selected_file,
            self.whisper_model.get(),
            bool(token),
        )

        self.transcribe_button.config(state="disabled")
        self.reidentify_button.config(state="disabled")
        self.progress["value"] = 0
        self.status_text.set("Preparing...")
        self._clear_transcript_view()

        thread = threading.Thread(target=self._run_transcription, daemon=True)
        thread.start()

    def _run_transcription(self):
        try:
            imported_path = transcriber.import_source_file(self.selected_file)

            output_path = transcriber.transcribe(
                imported_path,
                whisper_model=self.whisper_model.get(),
                hf_token=self.hf_token.get().strip() or None,
                progress_callback=self._set_status_threadsafe,
                on_lines=self._on_transcript_lines_threadsafe,
                on_progress=self._on_progress_threadsafe,
            )

            self.after(0, self._on_transcription_success, output_path)
        except Exception as error:
            logger.exception("Transcription failed")
            self.after(0, self._on_transcription_error, str(error))

    def _set_status_threadsafe(self, text):
        self.after(0, self.status_text.set, text)

    def _on_progress_threadsafe(self, fraction):
        self.after(0, self._set_progress_value, fraction)

    def _set_progress_value(self, fraction):
        self.progress["value"] = max(0.0, min(1.0, fraction)) * 100

    def _on_transcript_lines_threadsafe(self, lines, replace=False):
        self.after(0, self._update_transcript_view, lines, replace)

    def _clear_transcript_view(self):
        self.transcript_text.config(state="normal")
        self.transcript_text.delete("1.0", "end")
        self.transcript_text.config(state="disabled")

    def _update_transcript_view(self, lines, replace=False):
        if replace:
            self._clear_transcript_view()

        if not lines:
            return

        self.transcript_text.config(state="normal")
        self.transcript_text.insert("end", "\n".join(lines) + "\n")
        self.transcript_text.see("end")
        self.transcript_text.config(state="disabled")

    def _on_transcription_success(self, output_path):
        self.progress["value"] = 100
        self.transcribe_button.config(state="normal")
        self.reidentify_button.config(state="normal")
        self.status_text.set(f"Saved transcript: {os.path.basename(output_path)}")
        self.refresh_library()

    def _on_transcription_error(self, message):
        self.transcribe_button.config(state="normal")
        self.reidentify_button.config(state="normal")
        self.status_text.set("Transcription failed.")
        messagebox.showerror("Transcription failed", message)

    def refresh_library(self):
        self.tree.delete(*self.tree.get_children())
        for entry in library.list_transcriptions():
            self.tree.insert(
                "", "end", iid=entry["path"], values=(entry["filename"], entry["modified"])
            )

    def open_selected_folder(self):
        selection = self.tree.selection()
        if not selection:
            messagebox.showinfo("No selection", "Select a transcription from the library first.")
            return

        library.open_containing_folder(selection[0])

    def reidentify_selected(self):
        selection = self.tree.selection()
        if not selection:
            messagebox.showinfo("No selection", "Select a transcription from the library first.")
            return

        transcript_path = selection[0]

        token = self.hf_token.get().strip()
        if not token:
            messagebox.showwarning(
                "No Hugging Face token",
                "Enter a Hugging Face token above before running speaker identification.",
            )
            return

        audio_path = library.find_matching_audio(transcript_path)
        if not audio_path:
            audio_path = filedialog.askopenfilename(
                title="Select the matching audio file",
                filetypes=[
                    ("Audio files", " ".join(f"*{ext}" for ext in config.SUPPORTED_AUDIO_EXTENSIONS)),
                    ("All files", "*.*"),
                ],
            )
            if not audio_path:
                return

        config.save_hf_token(token)

        logger.info(
            "Re-running speaker identification: transcript=%s audio=%s",
            transcript_path,
            audio_path,
        )

        self.transcribe_button.config(state="disabled")
        self.reidentify_button.config(state="disabled")
        self.progress["value"] = 0
        self.status_text.set("Re-running speaker identification...")
        self._clear_transcript_view()

        thread = threading.Thread(
            target=self._run_reidentify,
            args=(transcript_path, audio_path, token),
            daemon=True,
        )
        thread.start()

    def _run_reidentify(self, transcript_path, audio_path, token):
        try:
            transcriber.reidentify_speakers(
                transcript_path,
                audio_path,
                token,
                progress_callback=self._set_status_threadsafe,
                on_lines=self._on_transcript_lines_threadsafe,
            )
            self.after(0, self._on_reidentify_success, transcript_path)
        except Exception as error:
            logger.exception("Speaker re-identification failed")
            self.after(0, self._on_transcription_error, str(error))

    def _on_reidentify_success(self, transcript_path):
        self.progress["value"] = 100
        self.transcribe_button.config(state="normal")
        self.reidentify_button.config(state="normal")
        self.status_text.set(f"Updated speaker labels: {os.path.basename(transcript_path)}")
        self.refresh_library()


def run():
    config.ensure_directories()
    app = TranscriptorApp()
    app.mainloop()
