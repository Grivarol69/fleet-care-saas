import { createUploadthing, type FileRouter } from "uploadthing/next";
import { createClient } from '@/utils/supabase/server';

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
            // Verificar autenticación usando nuestro cliente Supabase
            const supabase = await createClient();
            const { data: { user }, error } = await supabase.auth.getUser();

            if (!user || error) {
                throw new Error("Unauthorized");
            }

            // Retornar metadata que se pasará al onUploadComplete
            return {
                userId: user.id,
                userEmail: user.email
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // Código que se ejecuta después de la subida exitosa
            console.log("Upload complete for userId:", metadata.userId);
            console.log("File URL:", file.url);

            // Aquí podrías guardar la URL en tu base de datos
            // await prisma.vehicle.update({ ... })

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
            const supabase = await createClient();
            const { data: { user }, error } = await supabase.auth.getUser();

            if (!user || error) {
                throw new Error("Unauthorized");
            }

            return {
                userId: user.id,
                userEmail: user.email
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Document upload complete:", file.url);
            return { uploadedBy: metadata.userId };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;