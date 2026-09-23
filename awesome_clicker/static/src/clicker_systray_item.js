import { registry } from "@web/core/registry";
import { Component, signal, useListener, usePlugin } from "@odoo/owl";
import { ActionPlugin } from "@web/webclient/actions/action_plugin";

export class ClickerSystray extends Component {
    static template = "awesome_clicker.ClickerSystray";
    action = usePlugin(ActionPlugin);

    counter = signal(0);
    setup() {
        useListener(document.body, "click", () => this.counter.set(this.counter() + 1), { capture: true });
    }

    increment() {
        this.counter.set(this.counter() + 9);
    }

    openClientAction() {
        this.action.doAction({
            type: "ir.actions.client",
            tag: "awesome_clicker.client_action",
            target: "new",
            name: "Clicker",
        });
    }

}

export const systrayItem = {
    Component: ClickerSystray,
};

registry.category("systray").add("awesome_clicker.ClickerSystray", systrayItem, { sequence: 1000 });