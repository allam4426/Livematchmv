import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Switch, Route } from "wouter";
import Home from "./pages/home";
import LiveMatches from "./pages/live";
import MatchDetails from "./pages/match";
import AdminDashboard from "./pages/admin";
import NotFound from "./pages/not-found";
import StreamPage from "./pages/stream";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/live" component={LiveMatches} />
          <Route path="/match/:id" component={MatchDetails} />
          <Route path="/stream/:id" component={StreamPage} />
          <Route path="/admin" component={AdminDashboard} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </QueryClientProvider>
  );
}
