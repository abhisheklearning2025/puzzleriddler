import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Admin · PuzzleRiddler" };

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <section className="card login-card">
        <p className="kicker">PuzzleRiddler admin</p>
        <h1 className="display" style={{ fontSize: 24, margin: "2px 0 14px" }}>
          Sign in
        </h1>
        <LoginForm />
      </section>
    </div>
  );
}
