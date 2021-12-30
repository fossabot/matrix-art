export type MatrixEventBase = {
    type: string;
    event_id: string;
    room_id: string;
};

export type FileEvent = {
    url: string;
    name: string;
    mimetype: string;
    size: number;
};

export type ThumbnailFileEvent = ImageFields & {
    url: string;
    mimetype: string;
    size: number;
};

export type ImageFields = {
    width: number;
    height: number;
};

export type ImageEventContent = {
    // TODO maybe not correct as it may be formatted?
    "m.text": string;
    "m.file": FileEvent;
    "m.image": ImageFields;
    "m.thumbnail": ThumbnailFileEvent[];
};

export type MessageAlike = { "m.text": string; } | { body: string; mimetype: string; };
export type ImageEventContentWithCaption = ImageEventContent & {
    "m.caption": MessageAlike[];
};

export type ImageEvent = MatrixEventBase & {
    content: ImageEventContentWithCaption;
};


export type ImageGalleryContent = {
    "m.image_gallery": ImageEventContent[];
    "m.caption": MessageAlike[];
};

export type ImageGalleryEvent = MatrixEventBase & {
    content: ImageGalleryContent;
};

export type MatrixEvent = ImageEvent | ImageGalleryEvent;