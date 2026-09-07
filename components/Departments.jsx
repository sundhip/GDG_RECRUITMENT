"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import Marquee from "@/components/magicui/marquee";
import { reviews } from "@/constants/index";

export const ReviewCard = ({ img, name, username, body }) => {
  return (
    <figure
      className={cn(
        "relative w-64 cursor-pointer overflow-hidden rounded-xl border p-4",
        "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
        "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]"
      )}
    >
      <div className="flex flex-row items-center gap-2">
        <Image
          className="rounded-full"
          width={32}
          height={32}
          alt=""
          src={img || "/icon.svg"}
        />
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium dark:text-white">
            {name}
          </figcaption>
          <p className="text-xs font-medium dark:text-white/40">
            {username}
          </p>
        </div>
      </div>
      <blockquote className="mt-2 text-sm">
        {(body || "").slice(0, 50)} &hellip;
      </blockquote>
    </figure>
  );
};

const devRecord = {
  id: "development",
  name: "Development",
  username: "Heads : Rudresh & Gaurav",
  body: "Creating and maintaining applications, involving frontend, backend, and database management",
  img: "",
  invite: "#",
  date: "[Insert Date]",
};

const Departments = () => {
  const consolidated = useMemo(() => {
    const filtered = reviews
      .filter((r) => r.name !== "App Development")
      .filter((r) => r.name !== "Web Development");
    return [devRecord, ...filtered];
  }, []);

  const halfIndex = Math.ceil(consolidated.length / 2);
  const firstRow = consolidated.slice(0, halfIndex);
  const secondRow = consolidated.slice(halfIndex);

  return (
    <div className="cursor-pointer relative flex h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-none bg-background">
      <Marquee pauseOnHover>
        {firstRow.map((review) => (
          <Link key={review.id} href={`/${review.id}`}>
            <ReviewCard {...review} />
          </Link>
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover className="cursor-pointer">
        {secondRow.map((review) => (
          <Link key={review.id} href={`/${review.id}`}>
            <ReviewCard {...review} />
          </Link>
        ))}
      </Marquee>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white dark:from-background"></div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white dark:from-background"></div>
    </div>
  );
};

export default Departments;
