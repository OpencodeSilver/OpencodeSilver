// Callback trampoline for libghostty-vt's write-PTY option.
//
// libghostty-vt calls the PTY writer through its indirect function table, so
// the JavaScript host cannot pass a closure directly. This 112-byte module
// exports one function whose only job is to forward the call to an import the
// host implements. `build-libghostty-wasm.sh` compiles it and prints the bytes
// that `runtime.ts` embeds, so the browser never fetches it separately.
extern "env" fn silver_terminal_write(terminal: u32, userdata: u32, data: u32, len: u32) void;

export fn ghostty_write_pty(terminal: u32, userdata: u32, data: u32, len: u32) void {
    silver_terminal_write(terminal, userdata, data, len);
}
