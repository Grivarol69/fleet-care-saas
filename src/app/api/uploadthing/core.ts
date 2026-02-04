import { createUploadthing, type FileRouter } from "uploadthing/next";
import { currentUser } from "@clerk/nextjs/server";

const f = createUploadthing();

export const ourFileRouter = {
    // Vehicle image uploader
    vehicleImageUploader: f({
        image: {
            maxFileSize: "4MB",
            maxFileCount: 1
        }
    })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new Error("Unauthorized");

            return {
                userId: user.id,
                userEmail: user.emailAddresses[0]?.emailAddress
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Upload complete for userId:", metadata.userId);
            console.log("File URL:", file.url);
            return { uploadedBy: metadata.userId };
        }),

    // Document uploader (SOAT, Tecnomecánica, etc.)
    documentUploader: f({
        pdf: {
            maxFileSize: "8MB",
            maxFileCount: 1
        },
        image: {
            maxFileSize: "4MB",
            maxFileCount: 1
        }
    })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new Error("Unauthorized");

            return {
                userId: user.id,
                userEmail: user.emailAddresses[0]?.emailAddress
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Document upload complete:", file.url);
            return { uploadedBy: metadata.userId };
        }),

    // Invoice uploader (Facturas de compra)
    invoiceUploader: f({
        pdf: {
            maxFileSize: "8MB",
            maxFileCount: 1
        },
        image: {
            maxFileSize: "8MB",
            maxFileCount: 1
        }
    })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new Error("Unauthorized");

            return {
                userId: user.id,
                userEmail: user.emailAddresses[0]?.emailAddress
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Invoice upload complete:", file.url);
            return { uploadedBy: metadata.userId };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;