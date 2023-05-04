import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import axios from "axios";
import AddressLink from "../AddressLink";
import PlaceGallery from "../PlaceGallery";
import BookingDates from "../BookingDates";
import { toast } from "react-toastify";

const BookingPage = () => {
  const [booking, setBooking] = useState(null);
  const [data, setData] = useState(null);
  const { id } = useParams();
  const [redirect, setRedirect] = useState(false);


  //get data
  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  async function fetchData() {
    const res = await axios.get("/bookings");
    const data = res.data;
    setData(data);
    const foundBooking = data.find(({ _id }) => _id === id)
    if (foundBooking) {
      setBooking(foundBooking);
    }
  }

  if (!booking) {
    return "";
  }

  //cancel booking
async function cancelBooking (){
  const res=await axios.delete(`/account/bookings/${id}`)
  toast("Cancellation successful");
  setRedirect(true)
}

if(redirect){
  return <Navigate to={'/account/bookings'}/>
}

  return (
    <div className="my-8">
      <h1 className="text-3xl">{booking.place.title}</h1>
      <AddressLink className="my-2 block">{booking.place.address}</AddressLink>
      <div className="bg-gray-200 p-6 my-6 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl mb-4">Your booking information:</h2>
          <BookingDates booking={booking} />
        </div>
        <div className="bg-primary p-6 text-white rounded-2xl">
          <div>Total price</div>
          <div className="text-3xl">${booking.price}</div>
        </div>
      </div>
      <PlaceGallery place={booking.place} />
      <button className="bg-red-400 p-2 w-full text-white rounded-2xl my-4" onClick={cancelBooking}>Cancel booking</button>
    </div>
  );
};

export default BookingPage;
