import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-32 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="font-display text-7xl text-paper mb-4"
      >
        404
      </motion.div>
      <h1 className="font-display text-2xl text-paper mb-3">This page can't be proven to exist.</h1>
      <p className="text-paper-muted mb-8">
        No circuit, no witness, no route. Let's get you back to solid ground.
      </p>
      <Button as={Link} to="/">
        Back to home
      </Button>
    </div>
  );
}
