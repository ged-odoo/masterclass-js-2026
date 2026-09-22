import { Component, usePlugin, onWillStart, signal, onMounted } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { Layout } from "@web/search/layout";
import { ActionPlugin } from "@web/webclient/actions/action_plugin";
import { DashboardItem } from "./dashboard_item";
import { rpc } from "@web/core/network/rpc";
import { ReportingPlugin } from "./reporting_plugin";

class AwesomeDashboard extends Component {
    static template = "awesome_dashboard.AwesomeDashboard";
    static components = { Layout, DashboardItem };
    action = usePlugin(ActionPlugin);
    statistics = signal(null);
    reporting = usePlugin(ReportingPlugin);

    setup() {
        onWillStart(async () => {
            const data = await this.reporting.loadStatistics();
            this.statistics.set(data);
        });
    }

    openCustomerView() {
        console.log("Opening customer view...");
        this.action.doAction("base.action_partner_form");
    }

    openLeads() {
        this.action.doAction({
            type: "ir.actions.act_window",
            name: "All leads",
            res_model: "crm.lead",
            views: [
                [false, "list"],
                [false, "form"],
            ],
        });
    }
}

registry.category("actions").add("awesome_dashboard.dashboard", AwesomeDashboard);
