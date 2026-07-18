function toggleForm(isSignup) {
    document.getElementById("loginFields").style.display = isSignup ? "none" : "block";
    document.getElementById("signupFields").style.display = isSignup ? "block" : "none";
    
    document.getElementById("formTitle").innerText = isSignup ? "Register Hospital" : "Hospital Portal";
    document.getElementById("formSubtitle").innerText = isSignup ? "Join the TrackNHeal network" : "Access your hospital dashboard";
    
    showMessage("", ""); // Clear msgs
}

function showMessage(msg, type) {
    const msgEl = document.getElementById("formMessage");
    if (!msg) {
        msgEl.style.display = "none";
        return;
    }
    msgEl.innerText = msg;
    msgEl.className = "dl-msg " + type;
    msgEl.style.display = "block";
}

async function handleHospitalLogin() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    
    if (!email || !password) {
        showMessage("Please enter email and password.", "error");
        return;
    }
    
    const btn = document.getElementById("loginBtn");
    btn.classList.add("loading");
    
    try {
        const response = await fetch("/hospital/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (data.success) {
            showMessage(data.message, "success");
            localStorage.setItem("hospitalId", data.hospitalId);
            localStorage.setItem("hospitalName", data.hospitalName);
            setTimeout(() => {
                window.location.href = "/hospital-dashboard.html";
            }, 1000);
        } else {
            showMessage(data.message, "error");
        }
    } catch (err) {
        showMessage("Connection error. Please try again.", "error");
    } finally {
        btn.classList.remove("loading");
    }
}

async function handleHospitalSignup() {
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    const address = document.getElementById("signupAddress").value.trim();
    const phone = document.getElementById("signupPhone").value.trim();
    
    if (!name || !email || !password) {
        showMessage("Please fill all required fields (*).", "error");
        return;
    }
    
    const btn = document.getElementById("signupBtn");
    btn.classList.add("loading");
    
    try {
        const response = await fetch("/hospital/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, address, phone })
        });
        
        const data = await response.json();
        if (data.success) {
            showMessage(data.message, "success");
            localStorage.setItem("hospitalId", data.hospitalId);
            localStorage.setItem("hospitalName", data.hospitalName);
            setTimeout(() => {
                window.location.href = "/hospital-dashboard.html";
            }, 1000);
        } else {
            showMessage(data.message, "error");
        }
    } catch (err) {
        showMessage("Connection error. Please try again.", "error");
    } finally {
        btn.classList.remove("loading");
    }
}
