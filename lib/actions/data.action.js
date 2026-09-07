import { connect, serializeFirestoreData } from "../db";
import { normalizeSubmission } from "../submissions";
import { getSessionUser } from "../security";
import { headers } from "next/headers";

export async function getData() {
  try {
    const reqHeaders = await headers();
    const user = await getSessionUser(reqHeaders);

    if (!user || user.role !== "admin") {
      return { status: 403, error: "Forbidden", message: "Admin access required" };
    }

    const db = await connect();
    const snapshot = await db.collection("formData").get();
    const data = snapshot.docs.map((doc) => {
      const serialized = serializeFirestoreData(doc.data());
      return normalizeSubmission({ id: doc.id, _id: doc.id, ...serialized });
    });

    return { status: 200, data };
  } catch (error) {
    console.error("Error fetching data:", error);
    return { status: 500, message: "Error fetching data" };
  }
}
