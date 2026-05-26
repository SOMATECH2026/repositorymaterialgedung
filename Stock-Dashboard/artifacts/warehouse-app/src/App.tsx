import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Dashboard } from "@/pages/dashboard";
import { Materials } from "@/pages/materials";
import { MaterialDetail } from "@/pages/material-detail";
import { Tools } from "@/pages/tools";
import { ToolDetail } from "@/pages/tool-detail";
import { MaterialRequests } from "@/pages/material-requests";
import { MaterialRequestNew } from "@/pages/material-request-new";
import { MaterialRequestDetail } from "@/pages/material-request-detail";
import { ToolRequests } from "@/pages/tool-requests";
import { ToolRequestNew } from "@/pages/tool-request-new";
import { ToolRequestDetail } from "@/pages/tool-request-detail";
import { StockMovements } from "@/pages/stock-movements";
import { Suppliers } from "@/pages/suppliers";
import { PurchaseOrders } from "@/pages/purchase-orders";
import { PurchaseOrderNew } from "@/pages/purchase-order-new";
import { PurchaseOrderDetail } from "@/pages/purchase-order-detail";
import { Reports } from "@/pages/reports";
import { Users } from "@/pages/users";
import { Settings } from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/materials" component={Materials} />
        <Route path="/materials/new" component={Materials} />
        <Route path="/materials/:id" component={MaterialDetail} />
        <Route path="/tools" component={Tools} />
        <Route path="/tools/new" component={Tools} />
        <Route path="/tools/:id" component={ToolDetail} />
        <Route path="/material-requests" component={MaterialRequests} />
        <Route path="/material-requests/new" component={MaterialRequestNew} />
        <Route path="/material-requests/:id" component={MaterialRequestDetail} />
        <Route path="/tool-requests" component={ToolRequests} />
        <Route path="/tool-requests/new" component={ToolRequestNew} />
        <Route path="/tool-requests/:id" component={ToolRequestDetail} />
        <Route path="/stock-movements" component={StockMovements} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/purchase-orders" component={PurchaseOrders} />
        <Route path="/purchase-orders/new" component={PurchaseOrderNew} />
        <Route path="/purchase-orders/:id" component={PurchaseOrderDetail} />
        <Route path="/reports" component={Reports} />
        <Route path="/users" component={Users} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
