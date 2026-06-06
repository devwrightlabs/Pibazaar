import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StoreHydration from "@/components/providers/StoreHydration";
import ThemeProvider from "@/components/providers/ThemeProvider";
import PiAuthProvider from "@/components/providers/PiAuthProvider";
import Navbar from "@/components/Navbar";
import RootErrorBoundary from "@/components/RootErrorBoundary";
import GlobalModal from "@/components/GlobalModal";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";

// Pages
import HomePage from "@/app/page";
import BrowsePage from "@/app/browse/page";
import BulkUploadPage from "@/app/bulk-upload/page";
import ChatListPage from "@/app/chat/page";
import ChatRoomPage from "@/app/chat/[id]/page";
import ChatNewPage from "@/app/chat/new/page";
import CheckoutPage from "@/app/checkout/[listingId]/page";
import CreatePage from "@/app/create/page";
import DashboardPage from "@/app/dashboard/page";
import LoginPage from "@/app/login/page";
import MapPage from "@/app/map/page";
import MarketplacePage from "@/app/marketplace/page";
import MessagesPage from "@/app/messages/page";
import ChatRoomPageV2 from "@/app/messages/[chatId]/page";
import NotificationsPage from "@/app/notifications/page";
import OrdersPage from "@/app/orders/page";
import OrderDetailPage from "@/app/orders/[orderId]/page";
import PrivacyPage from "@/app/privacy/page";
import ProductDetailPage from "@/app/products/[id]/page";
import ProfilePage from "@/app/profile/page";
import TermsPage from "@/app/terms/page";
import SettingsPage from "@/app/settings/page";
import ShippingPage from "@/app/shipping/page";
import EscrowPage from "@/app/transactions/escrow/[transactionId]/page";
import NotFound from "@/app/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/browse" component={BrowsePage} />
        <Route path="/bulk-upload" component={BulkUploadPage} />
        <Route path="/chat" component={ChatListPage} />
        <Route path="/chat/new" component={ChatNewPage} />
        <Route path="/chat/:id" component={ChatRoomPage} />
        <Route path="/checkout/:listingId" component={CheckoutPage} />
        <Route path="/create" component={CreatePage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/map" component={MapPage} />
        <Route path="/marketplace" component={MarketplacePage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/messages/:chatId" component={ChatRoomPageV2} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/orders/:orderId" component={OrderDetailPage} />
        <Route path="/products/:id" component={ProductDetailPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/shipping" component={ShippingPage} />
        <Route path="/transactions/escrow/:transactionId" component={EscrowPage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <StoreHydration />
        <ThemeProvider>
          <PiAuthProvider>
            <Navbar />
            <RootErrorBoundary>
              <AppRoutes />
            </RootErrorBoundary>
            <GlobalModal />
            <BottomNav />
          </PiAuthProvider>
        </ThemeProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
