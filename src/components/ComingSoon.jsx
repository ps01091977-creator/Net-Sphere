"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ArrowLeft, Construction } from "lucide-react";

export default function ComingSoon({ title }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="mb-6 flex justify-center">
          <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
            <Construction className="h-10 w-10 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          We're working hard to bring you this feature. Check back soon for updates!
        </p>
        <Link href="/">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
