import Image from "next/image";

type AvatarProps = {
  alt: string;
  className: string;
  src: string;
};

export function Avatar({ alt, className, src }: AvatarProps) {
  return (
    <Image
      alt={alt}
      className={`rounded-full object-cover ${className}`}
      height={380}
      src={src}
      width={380}
      priority
    />
  );
}
