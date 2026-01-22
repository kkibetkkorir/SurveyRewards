// Service Worker Registration with advanced features
class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateInterval = null;
  }

  async register() {
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker not supported");
      return;
    }

    try {
      this.registration =
        await navigator.serviceWorker.register("/service-worker.js");
      console.log("Service Worker registered:", this.registration);

      // Check for updates every 1 hour
      this.updateInterval = setInterval(() => {
        this.registration.update();
      }, 3600000);

      this.setupListeners();
      this.checkForUpdates();

      return this.registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

  setupListeners() {
    // Listen for controller change
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("Service Worker controller changed");
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      console.log("Message from Service Worker:", event.data);

      switch (event.data.type) {
        case "UPDATE_AVAILABLE":
          this.showUpdateNotification();
          break;
        case "CACHE_UPDATED":
          console.log("Cache updated successfully");
          break;
        case "OFFLINE_STATUS":
          this.updateOfflineStatus(event.data.isOffline);
          break;
      }
    });

    // Listen for install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Listen for app installed
    window.addEventListener("appinstalled", () => {
      console.log("SurveyRewards installed successfully");
      this.trackInstallation();
    });
  }

  checkForUpdates() {
    if (!this.registration) return;

    this.registration.addEventListener("updatefound", () => {
      const newWorker = this.registration.installing;
      console.log("New Service Worker found:", newWorker);

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          this.showUpdateNotification();
        }
      });
    });
  }

  showUpdateNotification() {
    if (window.Swal) {
      window.Swal.fire({
        title: "Update Available!",
        text: "A new version of SurveyRewards is available. Would you like to update now?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Update",
        cancelButtonText: "Later",
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.reload();
        }
      });
    } else {
      if (confirm("New version available! Reload to update?")) {
        window.location.reload();
      }
    }
  }

  showInstallPrompt() {
    // Store prompt dismissal in localStorage
    const promptDismissed = localStorage.getItem("installPromptDismissed");
    const promptShown = localStorage.getItem("installPromptShown");

    if (promptDismissed || promptShown) return;

    setTimeout(() => {
      if (window.Swal && this.deferredPrompt) {
        window.Swal.fire({
          title: "Install SurveyRewards",
          html: `
            <div style="text-align: center;">
              <i class="fas fa-mobile-alt" style="font-size: 48px; color: #059669; margin-bottom: 15px;"></i>
              <p>Install SurveyRewards on your device for faster access and offline functionality.</p>
            </div>
          `,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Install",
          cancelButtonText: "Not Now",
          showCloseButton: true,
        }).then((result) => {
          if (result.isConfirmed) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
              if (choiceResult.outcome === "accepted") {
                console.log("User accepted install prompt");
              }
              this.deferredPrompt = null;
            });
          } else {
            localStorage.setItem("installPromptDismissed", "true");
          }
        });

        localStorage.setItem("installPromptShown", "true");
      }
    }, 5000); // Show after 5 seconds
  }

  updateOfflineStatus(isOffline) {
    const indicator = document.getElementById("offlineIndicator");
    if (indicator) {
      indicator.style.display = isOffline ? "block" : "none";
    }
  }

  trackInstallation() {
    // Send installation analytics if needed
    console.log("Tracking installation...");

    if (window.gtag) {
      window.gtag("event", "install", {
        event_category: "Engagement",
        event_label: "PWA Installation",
      });
    }
  }

  async unregister() {
    if (this.registration) {
      await this.registration.unregister();
      console.log("Service Worker unregistered");
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Initialize Service Worker
const serviceWorkerManager = new ServiceWorkerManager();

// Export for use in React components
window.serviceWorkerManager = serviceWorkerManager;

// Register on load
window.addEventListener("load", () => {
  serviceWorkerManager.register();
});

// Export as module
export default serviceWorkerManager;
