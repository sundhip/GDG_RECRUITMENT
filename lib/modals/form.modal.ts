import { connect, serializeFirestoreData } from "../db";
import {
  buildCanonicalSubmission,
  generateSubmissionId,
  normalizeSubmission,
  CURRENT_SCHEMA_VERSION,
} from "../submissions";

export interface IAnswer {
  questionId: string;
  questionText: string;
  questionVersion?: number | string;
  type?: string;
  value: string;
}

export interface IFormData {
  id?: string;
  _id?: string;
  submissionId?: string;
  applicantId?: string;
  departmentId?: string;
  departmentName?: string;
  schemaVersion?: number;
  Name: string;
  Email: string;
  RegistrationNumber: string;
  Phone: string;
  Pref?: string;
  Department: string;
  Questions?: Record<string, string>;
  Answers?: IAnswer[];
  answers?: IAnswer[];
  shortlisted?: boolean;
  status?: string;
  responseCount?: number;
  questionIds?: string[];
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION_NAME = "formData";

const formatDoc = (doc: any) => {
  const data = doc.data ? doc.data() : doc;
  const serialized = serializeFirestoreData(data);
  return normalizeSubmission({
    id: doc.id,
    _id: doc.id,
    ...serialized,
  });
};

class FormDataModel {
  private data: any;

  constructor(data: IFormData) {
    this.data = buildCanonicalSubmission({
      applicant: {
        Name: data.Name,
        Email: data.Email,
        RegistrationNumber: data.RegistrationNumber,
        Phone: data.Phone,
      },
      departmentIdentifier: data.Department || data.departmentId || "",
      answersInput: data.Answers || data.answers || data.Questions || {},
      shortlisted: Boolean(data.shortlisted),
      pref: data.Pref || "",
    });
  }

  async save() {
    const db = await connect();
    const docId = this.data.submissionId || generateSubmissionId(this.data.Email, this.data.departmentId);
    const docRef = db.collection(COLLECTION_NAME).doc(docId);
    await docRef.set(this.data);
    const snapshot = await docRef.get();
    return formatDoc(snapshot);
  }

  static async create(data: IFormData) {
    return new FormDataModel(data).save();
  }

  static async find(query: Partial<IFormData> = {}) {
    const db = await connect();
    let ref: any = db.collection(COLLECTION_NAME);

    if (query.Email) ref = ref.where("Email", "==", query.Email.toLowerCase().trim());
    if (query.Department) ref = ref.where("Department", "==", query.Department);

    const snapshot = await ref.get();
    return snapshot.docs.map((doc: any) => formatDoc(doc));
  }

  static async findOne(query: Partial<IFormData> = {}) {
    const results = await FormDataModel.find(query);
    return results[0] || null;
  }

  static async countDocuments(query: Partial<IFormData> = {}) {
    const results = await FormDataModel.find(query);
    return results.length;
  }

  static async findByIdAndUpdate(
    id: string,
    update: Partial<IFormData> | { $set?: Partial<IFormData> },
  ) {
    const db = await connect();
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const updateData: any =
      update && typeof update === "object" && "$set" in update
        ? update.$set
        : update;

    updateData.updatedAt = new Date();
    await docRef.update(updateData ?? {});
    const snapshot = await docRef.get();
    return snapshot.exists ? formatDoc(snapshot) : null;
  }

  static async findById(id: string) {
    const db = await connect();
    const snapshot = await db.collection(COLLECTION_NAME).doc(id).get();
    return snapshot.exists ? formatDoc(snapshot) : null;
  }
}

export default FormDataModel;

