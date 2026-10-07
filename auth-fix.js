(() => {
  const supabaseUrl = window.POS_SUPABASE_URL;
  const supabaseKey = window.POS_SUPABASE_KEY;
  if (!window.supabase || !supabaseUrl || !supabaseKey) return;
  const client = window.supabase.createClient(supabaseUrl, supabaseKey);
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
              emailRedirectTo: window.location.origin
            }
          });

          if (result.error) throw result.error;

          if (result.data.session) {
            setMessage("Account created. Opening your POS…", "success");
            if (typeof window.boot === "function") await window.boot(result.data.user);
          } else {
            setMessage(
              "Account created successfully. Check your email and click the confirmation link, then sign in.",
              "success"
            );
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
        }
        setMessage(message, "error");
      } finally {
        submit.disabled = false;
      }
    };
  }

  setMode(false);
})();