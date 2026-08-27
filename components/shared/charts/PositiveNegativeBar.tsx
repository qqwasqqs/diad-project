interface PositiveNegativeBarProps {
    positive: number;
    negative: number;
  }
  
  export const PositiveNegativeBar = ({
    positive,
    negative,
  }: PositiveNegativeBarProps) => {
    return (
      <div className="overflow-hidden rounded-md border border-neutral-200">
        <div className="flex h-4">
          <div
            className="flex items-center justify-center bg-green-600 text-white text-[12px]"
            style={{ width: `${positive}%` }}
          >
            {positive}%
          </div>
  
          <div
            className="flex items-center justify-center bg-red-600 text-white text-[12px]"
            style={{ width: `${negative}%` }}
          >
            {negative}%
          </div>
        </div>
      </div>
    );
  };