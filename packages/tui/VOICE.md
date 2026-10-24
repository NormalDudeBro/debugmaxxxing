# Local Voice Input

The terminal prompt supports microphone dictation with local Whisper. Audio stays
in memory on the machine running the TUI, and is not uploaded to a transcription
service. A first-time model download requires internet access; subsequent use can
run offline with the cached model (or a local model directory).

## Setup

Use Python 3.11 or newer. Python 3.13 is verified on Windows:

```powershell
py -3.13 -m venv .venv-voice
.\.venv-voice\Scripts\python.exe -m pip install faster-whisper sounddevice
$env:OPENCODE_VOICE_PYTHON = "$PWD\.venv-voice\Scripts\python.exe"
```

Start the repository's TUI from that same shell. An already-running TUI must be
restarted to load the code and environment changes. No API key is required.
On Linux, sounddevice may also require your distribution's PortAudio package.
Allow microphone access for desktop applications in your OS privacy settings.

## Usage

1. Select `/voice` from prompt autocomplete, or choose **Dictate with local Whisper**
   in the command palette.
2. Wait for **Voice: recording**, then speak into your default microphone.
3. Choose **Stop voice recording** in the command palette (Ctrl+P).
   Recording also stops automatically after two minutes.
4. Wait for transcription. Review or edit the appended text, then send normally.

Choose **Cancel voice input** in the command palette to discard recording or
transcription. Switching sessions or closing the prompt cancels it too. Submission
is blocked while voice input is active. Recording does not run in the background
unless explicitly started. On SSH, the microphone belongs to the remote machine,
not the terminal client.

## Configuration

Set these environment variables before launching the TUI:

| Variable                  | Default                                  | Purpose                                            |
| ------------------------- | ---------------------------------------- | -------------------------------------------------- |
| `OPENCODE_VOICE_PYTHON`   | `python` on Windows, `python3` elsewhere | Python executable with dependencies installed      |
| `OPENCODE_VOICE_MODEL`    | `base`                                   | faster-whisper model name or local model directory |
| `OPENCODE_VOICE_LANGUAGE` | automatic detection                      | Language code, e.g. `en`                           |

Inference uses CPU int8, so a GPU is not required. `small` improves accuracy but
uses more memory and takes longer. Model loading occurs after recording stops;
the first transcription can take longer while the model downloads.
