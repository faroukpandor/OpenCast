# Physical WebUSB acceptance checklist

Automated browser tests verify the disconnected state and UI honesty. They cannot authorize or execute commands on a physical Android/Android TV device. Do not mark hardware support certified until this checklist is recorded on the target browser/OS/device.

## Preconditions

- Authorized device you own or have permission to test; backup important data.
- Chromium-based browser with WebUSB, HTTPS origin (or localhost), and a data-capable USB cable.
- Device developer options and USB debugging enabled only for the test; revoke debugging authorizations afterward if appropriate.
- Record browser/version, OS, device model, firmware, OpenCast commit, date, and tester. Never record serial numbers or personal data in public reports.

## Steps and expected results

1. Open WebUSB ADB studio while disconnected. Expect “No device is connected” and disabled command execution; no simulated shell output.
2. Click connect and choose the actual device in the browser chooser. Accept the device-side RSA debugging prompt only after verifying the computer. Expect a real connected state.
3. Deny/cancel the chooser on a second attempt. Expect an honest cancellation/error, not a connected state.
4. Run a harmless read-only command such as `getprop ro.product.model`. Expect output matching the device, bounded and labeled as actual output.
5. Reject the confirmation dialog for a command. Expect no command sent.
6. Test disconnect/unplug during a wait. Expect timeout/cancellation and a disconnected/error state. Note that cancelling a browser wait does not guarantee the device stopped executing.
7. Verify non-Android TVs and wireless-only devices are not presented as arbitrary TCP ADB targets.
8. Revoke USB debugging authorization and reconnect. Expect authorization to be requested again.

Record pass/fail and exact observed behavior for each step. A failure is a valid result; do not convert it into a pass. Repeat after browser, OS, firmware, or Tango dependency updates.
