import type { Database } from "@/db";

/** The database, or a transaction opened on it: both expose the same query builder. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transaction;
