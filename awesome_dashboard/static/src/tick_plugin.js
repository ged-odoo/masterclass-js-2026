// import { Plugin, onWillDestroy, usePlugin } from "@odoo/owl";
// import { NotificationPlugin }
//     from "@web/core/notifications/notification_plugin";
// import { services } from "@web/core/services";

// class TickTockPlugin extends Plugin {
//     notification = usePlugin(NotificationPlugin);

//     setup() {
//         let counter = 1;
//         const id = setInterval(() => {
//             this.notification.add(`Tick Tock ${counter++}`);
//         }, 2000);
//         onWillDestroy(() => clearInterval(id));
//     }
// }

// services.add(TickTockPlugin);