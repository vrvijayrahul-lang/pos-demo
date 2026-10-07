(() => {
  const supabaseUrl = window.POS_SUPABASE_URL;
  const supabaseKey = window.POS_SUPABASE_KEY;
  if (!window.supabase || !supabaseUrl || !supabaseKey) return;
  const client = window.supabase.createClient(supabaseUrl, supabaseKey);
  // Always return confirmed users to the live POS, even when signup was initiated from localhost.
  const AUTH_REDIRECT_URL = "https://pos-demo-roan-six.vercel.app";
  const byId = id => document.getElementById(id);
  let signupMode = false;

  const setMessage = (message, type="") => {
    const el = byId("authMessage");
    if (!el) return;
    el.textContent = message;
    el.className = "form-message " + type;
  };

  const setMode = signup => {
    signupMode = !!signup;
    const nameField = byId("nameField");
    const title = byId("authTitle");
    const subtitle = byId("authSubtitle");
    const submit = byId("authSubmit");
    const resendBtn = byId("resendVerification");
  const switchBtn = byId("authSwitch");
    if (!nameField || !title || !subtitle || !submit || !switchBtn) return;
    nameField.classList.toggle("hidden", !signupMode);
    title.textContent = signupMode ? "Create your POS account" : "Welcome back";
    subtitle.textContent = signupMode
      ? "Create a cashier account to start using the POS."
      : "Sign in to open your POS counter.";
    submit.innerHTML = signupMode ? "Create account <span>→</span>" : "Sign in <span>→</span>";
    switchBtn.textContent = signupMode ? "I already have an account" : "Create a new account";
    switchBtn.type = "button";
    if (resendBtn) resendBtn.classList.add("hidden");
    setMessage("");
  };

  const switchBtn = byId("authSwitch");
  if (switchBtn) {
    switchBtn.type = "button";
    switchBtn.onclick = event => {
      event.preventDefault();
      setMode(!signupMode);
    };
  }

  const form = byId("authForm");
  if (form) {
    form.onsubmit = async event => {
      event.preventDefault();
      const email = byId("authEmail").value.trim();
      const password = byId("authPassword").value;
      const name = (byId("authName").value || "").trim() || "Cashier";
      const submit = byId("authSubmit");

      if (!email || !password) {
        setMessage("Please enter your email and password.", "error");
        return;
      }

      submit.disabled = true;
      setMessage(signupMode ? "Creating your account…" : "Signing in…");

      try {
        if (signupMode) {
          const result = await client.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: name },
              emailRedirectTo: AUTH_REDIRECT_URL
            }
          });

          if (result.error) throw result.error;

          if (result.data.session) {
            setMessage("Account created. Opening your POS…", "success");
            if (typeof window.boot === "function") await window.boot(result.data.user);
          } else {
            setMessage("Account exists but still needs email verification. Check your inbox/spam, or resend the verification email below.", "success");
            if (resendBtn) resendBtn.classList.remove("hidden");
          }
        } else {
          const result = await client.auth.signInWithPassword({ email, password });
          if (result.error) throw result.error;
          setMessage("Login successful. Opening your POS…", "success");
          if (typeof window.boot === "function") await window.boot(result.data.user);
        }
      } catch (error) {
        console.error("RetailFlow authentication error:", error);
        let message = error?.message || "Authentication failed.";
        if (/already registered|user already registered/i.test(message)) {
          message = "This email is already registered. Use Sign in instead.";
          if (resendBtn) resendBtn.classList.remove("hidden");
        }
        if (/email not confirmed|email_not_confirmed/i.test(message)) {
          message = "Your email is not confirmed yet. Use the button below to send a new verification email.";
          if (resendBtn) resendBtn.classList.remove("hidden");
        }
        setMessage(message, "error");
      } finally {
        submit.disabled = false;
      }
    };
  }

  if (resendBtn) {
    resendBtn.onclick = async () => {
      const email = byId("authEmail").value.trim();
      if (!email) { setMessage("Enter your email address first.", "error"); return; }
      resendBtn.disabled = true;
      setMessage("Sending a new verification email…");
      try {
        const result = await client.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: AUTH_REDIRECT_URL }
        });
        if (result.error) throw result.error;
        setMessage("A new verification email has been requested. Check your inbox and spam folder.", "success");
      } catch (error) {
        console.error("RetailFlow resend verification error:", error);
        setMessage(error?.message || "Could not resend the verification email.", "error");
      } finally { resendBtn.disabled = false; }
    };
  }

  // If Supabase returns the browser to the app with a session in the URL, let the client restore it.
  client.auth.getSession().then(({ data }) => {
    if (data?.session && typeof window.boot === "function") window.boot(data.session.user);
  });
  setMode(false);
})();